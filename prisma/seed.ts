import { PrismaClient, Profesion } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Contraseña por defecto para todos los usuarios del seed.
// IMPORTANTE: Cada usuario debe cambiarla en su primer acceso.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_PASSWORD = 'VinamedCl2025!';
const SALT_ROUNDS = 12;

interface StaffSeedData {
  rut: string;
  nombre: string;
  email: string;
  profesion: Profesion;
  registro_sis: string | null;
  facultades: string[];
}

const STAFF: StaffSeedData[] = [
  {
    rut: '17.479.898-2',
    nombre: 'Juan Pablo Cárdenas Galleguillos',
    email: 'jpcardenas@vinamed.cl',
    profesion: Profesion.TECNOLOGO_MEDICO,
    registro_sis: 'SIS-TM-001',
    // Tecnólogo: crea y edita informes, puede ver todos (para coordinación de turno)
    facultades: ['ECO_WRITE', 'ECO_READ_ALL'],
  },
  {
    rut: '18.553.131-7',
    nombre: 'Sebastián Monsalve Astudillo',
    email: 'smonsalve@vinamed.cl',
    profesion: Profesion.TECNOLOGO_MEDICO,
    registro_sis: 'SIS-TM-002',
    // Tecnólogo: crea y edita informes, puede ver todos
    facultades: ['ECO_WRITE', 'ECO_READ_ALL'],
  },
  {
    rut: '20.988.528-K',
    nombre: 'Ignacio Gabriel Mateluna Maturana',
    email: 'imateluna@vinamed.cl',
    profesion: Profesion.ENFERMERO,
    registro_sis: 'SIS-EN-001',
    // Enfermero: crea informes y acceso total de lectura
    facultades: ['ECO_WRITE', 'ECO_READ_ALL'],
  },
];

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║          ViñaMed — Seed de Staff Clínico            ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const passwordHash = await bcryptjs.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  console.log(`🔑  Hash de contraseña generado (bcrypt, ${SALT_ROUNDS} rounds)\n`);

  for (const staff of STAFF) {
    const user = await prisma.user.upsert({
      where: { rut: staff.rut },
      update: {
        nombre:       staff.nombre,
        email:        staff.email,
        profesion:    staff.profesion,
        registro_sis: staff.registro_sis,
        facultades:   staff.facultades,
        activo:       true,
      },
      create: {
        rut:          staff.rut,
        nombre:       staff.nombre,
        email:        staff.email,
        password_hash: passwordHash,
        profesion:    staff.profesion,
        registro_sis: staff.registro_sis,
        facultades:   staff.facultades,
        activo:       true,
      },
    });

    const facultadesStr = (staff.facultades as string[]).join(', ');

    console.log(`✅  ${user.nombre}`);
    console.log(`    RUT:          ${user.rut}`);
    console.log(`    Email:        ${user.email}`);
    console.log(`    Profesión:    ${user.profesion}`);
    console.log(`    Registro SIS: ${user.registro_sis ?? '—'}`);
    console.log(`    Facultades:   [${facultadesStr}]`);
    console.log(`    ID:           ${user.id}`);
    console.log();
  }

  console.log('─'.repeat(54));
  console.log(`📋  Contraseña inicial para todos: ${DEFAULT_PASSWORD}`);
  console.log('⚠️   Cambiar en el primer acceso al sistema.');
  console.log('─'.repeat(54));
  console.log(`\n✔   Seed completado — ${STAFF.length} usuarios creados/actualizados.\n`);
}

main()
  .catch((error) => {
    console.error('\n❌  Error durante el seed:\n', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
