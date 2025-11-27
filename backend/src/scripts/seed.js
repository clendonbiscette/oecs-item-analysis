import bcrypt from 'bcrypt';
import { query } from '../db.js';

async function seed() {
  try {
    console.log('Creating admin user...');
    
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await query(
      `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@oecs.org', passwordHash, 'System Administrator', 'admin']
    );
    
    console.log('✓ Admin user created successfully');
    console.log('\nLogin credentials:');
    console.log('  Email: admin@oecs.org');
    console.log('  Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
