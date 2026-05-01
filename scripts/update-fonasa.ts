import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

const data = [
  { "codigo": "0101001", "total": 12930, "bonificacion": 5680, "copago": 7250 },
  { "codigo": "010100SM", "total": 37930, "bonificacion": 20420, "copago": 17510 },
  { "codigo": "0101321", "total": 19220, "bonificacion": 7690, "copago": 11530 },
  { "codigo": "0404003", "total": 35840, "bonificacion": 22050, "copago": 13790 },
  { "codigo": "0404006", "total": 19070, "bonificacion": 11730, "copago": 7340 },
  { "codigo": "0404009", "total": 19930, "bonificacion": 12260, "copago": 7670 },
  { "codigo": "0404010", "total": 24840, "bonificacion": 15280, "copago": 9560 },
  { "codigo": "0404012", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404014", "total": 24650, "bonificacion": 15170, "copago": 9480 },
  { "codigo": "04040146", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404015", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016AD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016AI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016BD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016BI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016C", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CA", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CAD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CAI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016CU", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016D", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016DD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016DI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016G", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016GD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016GI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016HD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016HI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016HPD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016HPI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016ID", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016II", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016L", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016LP", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MÑD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MÑI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MUD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016MUI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016o", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016oo", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PA", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PCD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PCI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PID", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016PII", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016RD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016RI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016S", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016T", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016TAD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016TAI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016TD", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404016TI", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "04040416PA", "total": 24970, "bonificacion": 15360, "copago": 9610 },
  { "codigo": "0404118", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118a", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118as", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118av", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118avs", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118s", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118t", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118v", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404118vs", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "0404119", "total": 77390, "bonificacion": 47620, "copago": 29770 },
  { "codigo": "0404121", "total": 84450, "bonificacion": 51970, "copago": 32480 },
  { "codigo": "0404121DA", "total": 84450, "bonificacion": 51970, "copago": 32480 },
  { "codigo": "0404121R", "total": 84450, "bonificacion": 51970, "copago": 32480 },
  { "codigo": "040418av2", "total": 81950, "bonificacion": 50430, "copago": 31520 },
  { "codigo": "040418p", "total": 81950, "bonificacion": 50430, "copago": 31520 }
];

async function main() {
  const map = new Map();
  for (const d of data) map.set(d.codigo.toLowerCase(), d);

  const snapshot = await getDocs(collection(db, 'gestion_prestaciones'));
  let count = 0;

  for (const d of snapshot.docs) {
    const cod = (d.data().codigo || '').toLowerCase();
    const prestacion = map.get(cod);
    if (prestacion) {
      // Find if 'Fonasa Nivel 2' or 'Fonasa' exists
      let valores = d.data().valoresPrevision || [];
      const index = valores.findIndex((v: any) => v.tipo === 'Fonasa Nivel 2' || v.tipo === 'Fonasa');
      
      const newValor = {
        tipo: 'Fonasa Nivel 2',
        valor: prestacion.total,
        copago: prestacion.copago,
        bonificacion: prestacion.bonificacion
      };

      if (index >= 0) {
        valores[index] = newValor;
      } else {
        valores.push(newValor);
      }

      await updateDoc(doc(db, 'gestion_prestaciones', d.id), {
        valoresPrevision: valores
      });
      count++;
      console.log(`Updated ${cod}`);
    }
  }

  console.log(`Done! Updated ${count} records.`);
  process.exit(0);
}

main().catch(console.error);
