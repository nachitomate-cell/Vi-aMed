import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function clearEco() {
  const snap = await getDocs(collection(db, 'gestion_prestaciones'));
  let deleted = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.nombre && data.nombre.toLowerCase().includes('eco')) {
      await deleteDoc(doc(db, 'gestion_prestaciones', d.id));
      deleted++;
    }
  }
  console.log('Borradas', deleted, 'prestaciones de eco');
  process.exit(0);
}
clearEco().catch(console.error);
