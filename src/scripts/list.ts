import {collection,getDocs} from 'firebase/firestore';
import {db} from '../lib/firebase';
getDocs(collection(db,'gestion_prestaciones'))
  .then(s=>s.docs.map(d=>d.data().nombre))
  .then(names => {
    console.log(JSON.stringify(names, null, 2));
    process.exit(0);
  });
