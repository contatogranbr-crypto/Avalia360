import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Admin (Service Role)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
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

async function startServer() {
  console.log('Starting server initialization...');
  const app = express();
  const PORT = 3000;

  // Request logger
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', supabaseConfigured: !!supabaseAdmin });
  });

  // API Route for secure login with Access Key
  app.post('/api/auth/login-with-key', async (req, res) => {
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
  app.post('/api/admin/delete-user', async (req, res) => {
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
  app.post('/api/admin/create-user', async (req, res) => {
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
  app.post('/api/admin/get-data', async (req, res) => {
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

  // API Route to update user (Admin only)
  app.post('/api/admin/update-user', async (req, res) => {
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
  app.post('/api/user/get-evaluations', async (req, res) => {
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
        return res.json({ success: true, evaluations: evaluationsWithTags });
      }

      res.json({ success: true, evaluations: [] });
    } catch (error: any) {
      console.error('Error in get-evaluations API:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route to update settings (Admin only)
  app.post('/api/admin/update-settings', async (req, res) => {
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
  app.post('/api/admin/trigger-cycle', async (req, res) => {
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

  // API Route for employees to submit an evaluation
  app.post('/api/user/submit-evaluation', async (req, res) => {
    const { email, accessKey, evaluationId, rating, comment } = req.body;

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
          rating,
          comment,
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
  app.all('/api/*', (req, res) => {
    console.warn(`Unmatched API route: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'API route not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware initialized.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });
}

startServer();
