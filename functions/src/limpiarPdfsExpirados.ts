import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

export const limpiarPdfsExpirados = onSchedule(
  { schedule: 'every 24 hours', timeZone: 'America/Santiago' },
  async () => {
    const db      = admin.firestore();
    const storage = admin.storage();
    const ahora   = admin.firestore.Timestamp.now();

    const snap = await db
      .collection('generadorPdf')
      .where('expiraEn', '<=', ahora)
      .get();

    if (snap.empty) {
      console.log('No hay PDFs expirados.');
      return;
    }

    const batch = db.batch();
    const eliminarStorage: Promise<void>[] = [];

    snap.docs.forEach(docSnap => {
      const { pdfStoragePath } = docSnap.data();
      if (pdfStoragePath) {
        eliminarStorage.push(
          storage.bucket().file(pdfStoragePath).delete().then(() => undefined).catch(() => undefined),
        );
      }
      batch.delete(docSnap.ref);
    });

    await Promise.all(eliminarStorage);
    await batch.commit();

    console.log(`Eliminados ${snap.size} PDFs expirados.`);
  },
);
