import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase Admin (Service Role)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl as string, supabaseServiceKey as string)
  : null;

// Cleanup existing evaluations for admins (One-time check on startup)
if (supabaseAdmin) {
  (async () => {
    try {
      const { data: adminUsers } = await supabaseAdmin.from('users').select('uid').eq('role', 'admin');
      if (adminUsers && adminUsers.length > 0) {
        const adminUids = adminUsers.map(u => u.uid);
        const { error } = await supabaseAdmin.from('evaluations').delete().in('evaluated_id', adminUids).eq('status', 'pending');
        if (!error) console.log(`Cleaned up pending evaluations for ${adminUids.length} admins.`);
      }
    } catch (e) {
      console.error('Initial cleanup error:', e);
    }
  })();
}

// Body parser is handled in server.ts
// Middleware
router.use(express.json());
router.use((req, res, next) => {
  // Simplified logging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[API] ${req.method} ${req.url}`);
  }
  next();
});

  // Health check
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      supabaseConfigured: !!supabaseAdmin,
      version: '1.0.1',
      timestamp: new Date().toISOString()
    });
  });

  // API Route for secure login with Access Key
  router.post('/auth/login-with-key', async (req, res) => {
    const { email, accessKey } = req.body;

    if (!email || !accessKey) {
      return res.status(400).json({ error: 'Email and Access Key are required' });
    }

    try {
      // 0. Bootstrap Admin Logic
      const bootstrapAdmins = [
        { email: 'dyego1998@gmail.com', key: '91015513' },
        { email: 'diego.granbr@gmail.com', key: '91015513' }
      ];

      const bootstrapMatch = bootstrapAdmins.find(a => a.email === email && a.key === accessKey);
      
      if (bootstrapMatch) {
        console.log('Bootstrap admin login detected:', email);
        
        let userUid = `admin_${email.replace(/[@.]/g, '_')}`;
        let userData = { 
          uid: userUid, 
          email: email, 
          role: 'admin', 
          name: 'Administrador', 
          status: 'active',
          access_key: accessKey // IMPORTANT: Ensure key is here for bootstrap login
        };

        if (supabaseAdmin) {
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
          
          if (!existingUser) {
            console.log('Creating bootstrap admin in Supabase:', email);
            const { data: newUser } = await supabaseAdmin.from('users').insert({
              uid: userUid,
              name: 'Administrador',
              email: email,
              role: 'admin',
              status: 'active',
              access_key: accessKey
            }).select().single();
            if (newUser) userData = newUser;
          } else {
            console.log('Existing bootstrap admin found in Supabase:', email);
            userData = existingUser;
          }
        }

        console.log('Login successful (Bootstrap):', email);
        return res.json({ 
          success: true, 
          userData: userData,
          isBootstrap: true 
        });
      }

      // 1. Authenticate via Supabase
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase não configurado no servidor.' });
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'Usuário não encontrado ou desativado.' });
      }

      if (user.access_key !== accessKey) {
        return res.status(401).json({ error: 'Chave de acesso incorreta.' });
      }

      res.json({ success: true, userData: user });
    } catch (error: any) {
      console.error('Error in login-with-key API:', error);
      res.status(500).json({ error: 'Erro interno no servidor de autenticação.' });
    }
  });

  // API Route to delete user (Admin only)
  router.post('/admin/delete-user', async (req, res) => {
    const { uid, adminEmail, adminAccessKey } = req.body;

    if (!uid || !adminEmail || !adminAccessKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase não configurado.' });
      }

      // Verify Admin
      const bootstrapAdmins = [
        { email: 'dyego1998@gmail.com', key: '91015513' },
        { email: 'diego.granbr@gmail.com', key: '91015513' }
      ];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      
      let isAdmin = isBootstrap;
      if (!isAdmin) {
        const { data: adminUser } = await supabaseAdmin
          .from('users')
          .select('role, access_key')
          .eq('email', adminEmail)
          .single();
        
        if (adminUser?.role === 'admin' && adminUser.access_key === adminAccessKey) {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        return res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
      }

      // 1. Delete evaluations from Supabase
      const { error: evalError } = await supabaseAdmin
        .from('evaluations')
        .delete()
        .or(`evaluator_id.eq.${uid},evaluated_id.eq.${uid}`);
      
      if (evalError) throw evalError;

      // 2. Delete user from Supabase
      const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('uid', uid);

      if (deleteError) throw deleteError;

      res.json({ success: true, message: 'User and evaluations deleted successfully' });
    } catch (error: any) {
      console.error('Error in delete-user API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to create user (Admin only)
  router.post('/admin/create-user', async (req, res) => {
    const { userData, accessKey, adminEmail, adminAccessKey } = req.body;

    if (!userData || !accessKey || !adminEmail || !adminAccessKey) {
      console.warn('Missing required fields in create-user:', {
        hasUserData: !!userData,
        hasAccessKey: !!accessKey,
        hasAdminEmail: !!adminEmail,
        hasAdminAccessKey: !!adminAccessKey
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase não configurado.' });
      }

      // Verify Admin
      const bootstrapAdmins = [
        { email: 'dyego1998@gmail.com', key: '91015513' },
        { email: 'diego.granbr@gmail.com', key: '91015513' }
      ];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      
      let isAdmin = isBootstrap;
      if (!isAdmin) {
        const { data: adminUser } = await supabaseAdmin
          .from('users')
          .select('role, access_key')
          .eq('email', adminEmail)
          .single();
        
        if (adminUser?.role === 'admin' && adminUser.access_key === adminAccessKey) {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        return res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
      }

      // Generate UID
      const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create user in Supabase
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          uid,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          department: userData.department,
          position: userData.position,
          access_key: accessKey,
          status: 'active'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Generate evaluations for the new user
      try {
        const { data: activeUsers } = await supabaseAdmin
          .from('users')
          .select('uid, name, role')
          .eq('status', 'active');

        if (activeUsers && activeUsers.length > 1) {
          const newEvaluations: any[] = [];
          activeUsers.forEach((existingUser) => {
            if (existingUser.uid !== uid) {
              // 1. New user evaluates existing user (STRICT: only if BOTH are non-admins)
              if (userData.role !== 'admin' && existingUser.role !== 'admin') {
                newEvaluations.push({
                  evaluator_id: uid,
                  evaluator_name: userData.name,
                  evaluated_id: existingUser.uid,
                  evaluated_name: existingUser.name,
                  status: 'pending'
                });
              }

              // 2. Existing user evaluates new user (STRICT: only if BOTH are non-admins)
              if (existingUser.role !== 'admin' && userData.role !== 'admin') {
                newEvaluations.push({
                  evaluator_id: existingUser.uid,
                  evaluator_name: existingUser.name,
                  evaluated_id: uid,
                  evaluated_name: userData.name,
                  status: 'pending'
                });
              }
            }
          });

          if (newEvaluations.length > 0) {
            console.log(`[CreateUser] Generating ${newEvaluations.length} initial evaluations for employee ${uid}`);
            await supabaseAdmin.from('evaluations').insert(newEvaluations);
          }
        }
      } catch (evalError) {
        console.error('Error generating evaluations in backend:', evalError);
      }

      res.json({ success: true, uid, user: newUser });
    } catch (error: any) {
      console.error('Error in create-user API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to get all data (Admin only)
  router.post('/admin/get-data', async (req, res) => {
    const { adminEmail, adminAccessKey } = req.body;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase não configurado.' });
      }

      // Verify Admin
      const bootstrapAdmins = [
        { email: 'dyego1998@gmail.com', key: '91015513' },
        { email: 'diego.granbr@gmail.com', key: '91015513' }
      ];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      
      let isAdmin = isBootstrap;
      if (!isAdmin) {
        const { data: adminUser } = await supabaseAdmin
          .from('users')
          .select('role, access_key')
          .eq('email', adminEmail)
          .single();
        
        if (adminUser?.role === 'admin' && adminUser.access_key === adminAccessKey) {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        return res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
      }

      const { data: users } = await supabaseAdmin.from('users').select('*').order('name');
      const { data: evaluations } = await supabaseAdmin.from('evaluations').select('*');
      const { data: settings } = await supabaseAdmin.from('settings').select('*');

      res.json({ success: true, users, evaluations, settings });
    } catch (error: any) {
      console.error('Error in get-data API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to get custom forms (Admin only)
  router.post('/admin/get-forms', async (req, res) => {
    const { adminEmail, adminAccessKey } = req.body;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado.' });

      // Verify Admin
      const bootstrapAdmins = [{ email: 'dyego1998@gmail.com', key: '91015513' }, { email: 'diego.granbr@gmail.com', key: '91015513' }];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      if (!isBootstrap) {
        const { data: adminUser } = await supabaseAdmin.from('users').select('role, access_key').eq('email', adminEmail).single();
        if (adminUser?.role !== 'admin' || adminUser.access_key !== adminAccessKey) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      const { data: forms } = await supabaseAdmin.from('forms').select('*').order('created_at', { ascending: false });
      const { data: questions } = await supabaseAdmin.from('form_questions').select('*').order('order_index');

      res.json({ success: true, forms, questions });
    } catch (error: any) {
      console.error('Error in get-forms API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to create custom forms (Admin only)
  router.post('/admin/create-form', async (req, res) => {
    const { title, description, questions, adminEmail, adminAccessKey } = req.body;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado.' });

      // Verify Admin
      const bootstrapAdmins = [{ email: 'dyego1998@gmail.com', key: '91015513' }, { email: 'diego.granbr@gmail.com', key: '91015513' }];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      if (!isBootstrap) {
        const { data: adminUser } = await supabaseAdmin.from('users').select('role, access_key').eq('email', adminEmail).single();
        if (adminUser?.role !== 'admin' || adminUser.access_key !== adminAccessKey) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      // Insert Form
      const { data: newForm, error: formError } = await supabaseAdmin.from('forms').insert({ title, description }).select().single();
      if (formError || !newForm) throw formError || new Error('Failed to create form');

      // Insert Questions
      if (questions && questions.length > 0) {
        const formQuestions = questions.map((q: any, i: number) => ({
          form_id: newForm.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || [],
          required: q.required ?? true,
          order_index: i
        }));
        
        const { error: qsError } = await supabaseAdmin.from('form_questions').insert(formQuestions);
        if (qsError) throw qsError;
      }

      res.json({ success: true, form: newForm });
    } catch (error: any) {
      console.error('Error in create-form API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to delete custom forms (Admin only)
  router.post('/admin/delete-form', async (req, res) => {
    const { formId, adminEmail, adminAccessKey } = req.body;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado.' });

      // Verify Admin
      const bootstrapAdmins = [{ email: 'dyego1998@gmail.com', key: '91015513' }, { email: 'diego.granbr@gmail.com', key: '91015513' }];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      if (!isBootstrap) {
        const { data: adminUser } = await supabaseAdmin.from('users').select('role, access_key').eq('email', adminEmail).single();
        if (adminUser?.role !== 'admin' || adminUser.access_key !== adminAccessKey) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      // Delete Form (Cascade should handle questions if configured, but let's be explicit if not)
      // Actually, standard Supabase doesn't always have cascade enable by default on manual tables.
      await supabaseAdmin.from('form_questions').delete().eq('form_id', formId);
      const { error } = await supabaseAdmin.from('forms').delete().eq('id', formId);
      
      if (error) throw error;

      res.json({ success: true, message: 'Formulário excluído com sucesso.' });
    } catch (error: any) {
      console.error('Error in delete-form API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to update user (Admin only)
  router.post('/admin/update-user', async (req, res) => {
    const { uid, updateData, adminEmail, adminAccessKey } = req.body;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase não configurado.' });
      }

      // Verify Admin
      const bootstrapAdmins = [
        { email: 'dyego1998@gmail.com', key: '91015513' },
        { email: 'diego.granbr@gmail.com', key: '91015513' }
      ];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      
      let isAdmin = isBootstrap;
      if (!isAdmin) {
        const { data: adminUser } = await supabaseAdmin
          .from('users')
          .select('role, access_key')
          .eq('email', adminEmail)
          .single();
        
        if (adminUser?.role === 'admin' && adminUser.access_key === adminAccessKey) {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        return res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('uid', uid);

      if (updateError) throw updateError;

      res.json({ success: true, message: 'User updated successfully' });
    } catch (error: any) {
      console.error('Error in update-user API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route for employees to get their evaluations
  router.post('/user/get-evaluations', async (req, res) => {
    const { email, accessKey } = req.body;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase não configurado.' });
      }

      // Verify User
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !user || user.access_key !== accessKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data: evaluations, error: evalsError } = await supabaseAdmin
        .from('evaluations')
        .select('*')
        .eq('evaluator_id', user.uid);

      console.log(`[GetEvaluations] User: ${user.email} UID: ${user.uid}. Found: ${evaluations?.length || 0} evaluations.`);
      if (evalsError) console.error('[GetEvaluations] Error:', evalsError);

      if (evaluations) {
        // Server-side join to get role and department of evaluated users
        const { data: allUsers } = await supabaseAdmin.from('users').select('uid, role, department');
        const evaluationsWithTags = evaluations.map(e => {
          const target = allUsers?.find(u => u.uid === e.evaluated_id);
          return {
            ...e,
            evaluated_role: target?.role,
            evaluated_department: target?.department
          };
        });

        // Also fetch forms and questions if there are any forms associated with pending evaluations
        const pendingFormIds = [...new Set(evaluations.filter(e => e.status === 'pending' && e.form_id).map(e => e.form_id))];
        let forms = [];
        let form_questions = [];
        if (pendingFormIds.length > 0) {
           const { data: fData } = await supabaseAdmin.from('forms').select('*').in('id', pendingFormIds);
           const { data: qData } = await supabaseAdmin.from('form_questions').select('*').in('form_id', pendingFormIds).order('order_index');
           forms = fData || [];
           form_questions = qData || [];
        }

        return res.json({ success: true, evaluations: evaluationsWithTags, forms, form_questions });
      }

      res.json({ success: true, evaluations: [], forms: [], form_questions: [] });
    } catch (error: any) {
      console.error('Error in get-evaluations API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to update settings (Admin only)
  router.post('/admin/update-settings', async (req, res) => {
    const { settings, adminEmail, adminAccessKey } = req.body;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado.' });

      // Verify Admin
      const bootstrapAdmins = [{ email: 'dyego1998@gmail.com', key: '91015513' }, { email: 'diego.granbr@gmail.com', key: '91015513' }];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      if (!isBootstrap) {
        const { data: adminUser } = await supabaseAdmin.from('users').select('role, access_key').eq('email', adminEmail).single();
        if (adminUser?.role !== 'admin' || adminUser.access_key !== adminAccessKey) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      for (const key in settings) {
        await supabaseAdmin.from('settings').upsert({ key, value: String(settings[key]), updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }

      res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error: any) {
      console.error('Error in update-settings API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to trigger a new evaluation cycle (Admin only)
  router.post('/admin/trigger-cycle', async (req, res) => {
    const { adminEmail, adminAccessKey } = req.body;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado.' });

      // Verify Admin
      const bootstrapAdmins = [{ email: 'dyego1998@gmail.com', key: '91015513' }, { email: 'diego.granbr@gmail.com', key: '91015513' }];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      if (!isBootstrap) {
        const { data: adminUser } = await supabaseAdmin.from('users').select('role, access_key').eq('email', adminEmail).single();
        if (adminUser?.role !== 'admin' || adminUser.access_key !== adminAccessKey) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      // 1. Get all active users
      const { data: activeUsers } = await supabaseAdmin.from('users').select('*').eq('status', 'active');
      if (!activeUsers) throw new Error('No active users found');

      console.log(`[TriggerCycle] Found ${activeUsers.length} active users.`);
      activeUsers.forEach(u => console.log(` - User: ${u.email}, Role: ${u.role}, UID: ${u.uid}`));

      // 2. Generate 360 evaluations (STRICT: everyone evaluates everyone else, EXCLUDING ALL ADMINS)
      const newEvaluations: any[] = [];
      activeUsers.forEach(evaluator => {
        activeUsers.forEach(evaluated => {
          // Rule: Evaluator must not be self AND Evaluator must not be admin AND Target must not be admin
          const isSelf = evaluator.uid === evaluated.uid;
          const isEvaluatorAdmin = evaluator.role === 'admin';
          const isTargetAdmin = evaluated.role === 'admin';

          if (!isSelf && !isEvaluatorAdmin && !isTargetAdmin) {
            newEvaluations.push({
              evaluator_id: evaluator.uid,
              evaluator_name: evaluator.name,
              evaluated_id: evaluated.uid,
              evaluated_name: evaluated.name,
              status: 'pending'
            });
          }
        });
      });

      console.log(`[TriggerCycle] Prep ${newEvaluations.length} new employee-to-employee evaluations.`);

      if (newEvaluations.length > 0) {
        const { error: insertError } = await supabaseAdmin.from('evaluations').insert(newEvaluations);
        if (insertError) console.error('[TriggerCycle] Insert Error:', insertError);
      }

      // Cleanup: Purge any evaluations where an admin is involved (in case of legacy data)
      const { data: adminUsers } = await supabaseAdmin.from('users').select('uid').eq('role', 'admin');
      const adminUids = adminUsers?.map(a => a.uid) || [];
      if (adminUids.length > 0) {
        console.log(`[TriggerCycle] Purging legacy evaluations for ${adminUids.length} admin(s):`, adminUids);
        await supabaseAdmin.from('evaluations').delete().in('evaluator_id', adminUids);
        await supabaseAdmin.from('evaluations').delete().in('evaluated_id', adminUids);
      }

      res.json({ success: true, message: `Novo ciclo iniciado com ${newEvaluations.length} avaliações. Administradores foram excluídos do ciclo.` });
    } catch (error: any) {
      console.error('Error in trigger-cycle API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to trigger a CUSTOM evaluation cycle (Admin only)
  router.post('/admin/trigger-cycle-custom', async (req, res) => {
    const { formId, evaluatorIds, evaluatedIds, adminEmail, adminAccessKey } = req.body;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado.' });

      if (!evaluatorIds || !evaluatedIds || evaluatorIds.length === 0 || evaluatedIds.length === 0) {
        return res.status(400).json({ error: 'Selecione ao menos um avaliador e um avaliado.' });
      }

      // Verify Admin
      const bootstrapAdmins = [{ email: 'dyego1998@gmail.com', key: '91015513' }, { email: 'diego.granbr@gmail.com', key: '91015513' }];
      const isBootstrap = bootstrapAdmins.some(a => a.email === adminEmail && a.key === adminAccessKey);
      if (!isBootstrap) {
        const { data: adminUser } = await supabaseAdmin.from('users').select('role, access_key').eq('email', adminEmail).single();
        if (adminUser?.role !== 'admin' || adminUser.access_key !== adminAccessKey) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      // Verify components
      const { data: users } = await supabaseAdmin.from('users').select('uid, name');
      if (!users) throw new Error('Could not fetch users');

      const evaluators = users.filter(u => evaluatorIds.includes(u.uid));
      const targets = users.filter(u => evaluatedIds.includes(u.uid));

      const newEvaluations: any[] = [];
      evaluators.forEach(evaluator => {
        targets.forEach(target => {
          // Rule: do we permit self-eval in custom cycle? I'll allow if explicitly selected.
          newEvaluations.push({
            form_id: formId || null,
            evaluator_id: evaluator.uid,
            evaluator_name: evaluator.name,
            evaluated_id: target.uid,
            evaluated_name: target.name,
            status: 'pending'
          });
        });
      });

      if (newEvaluations.length > 0) {
        const { error: insertError } = await supabaseAdmin.from('evaluations').insert(newEvaluations);
        if (insertError) throw insertError;
      }

      res.json({ success: true, message: `Ciclo personalizado iniciado com ${newEvaluations.length} avaliações.` });
    } catch (error: any) {
      console.error('Error in trigger-cycle-custom API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route for employees to submit an evaluation
  router.post('/user/submit-evaluation', async (req, res) => {
    const { email, accessKey, evaluationId, rating, comment, answers } = req.body;

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase não configurado.' });
      }

      // Verify User
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !user || user.access_key !== accessKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify ownership of evaluation
      const { data: evaluation } = await supabaseAdmin
        .from('evaluations')
        .select('*')
        .eq('id', evaluationId)
        .eq('evaluator_id', user.uid)
        .single();

      if (!evaluation) {
        return res.status(403).json({ error: 'Evaluation not found or not owned by user' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('evaluations')
        .update({
          rating: rating || evaluation.rating,
          comment: comment || evaluation.comment,
          answers: answers || null,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', evaluationId);

      if (updateError) throw updateError;

      res.json({ success: true, message: 'Evaluation submitted successfully' });
    } catch (error: any) {
      console.error('Error in submit-evaluation API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Catch-all for unmatched /api routes
  router.all('/*', (req, res) => {
    console.warn(`[API 404] Unmatched route: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: 'API route not found', 
      method: req.method, 
      url: req.url 
    });
  });

export default router;
