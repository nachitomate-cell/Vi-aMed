import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const CambiarContrasenaPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Firebase requiere reautenticación para cambios de contraseña sensibles
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Actualizar
      await updatePassword(user, newPassword);
      
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setError('La contraseña actual es incorrecta');
      } else {
        setError('Error al actualizar la contraseña. Intente cerrar sesión e iniciar de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Cambiar Contraseña</h1>
          <p className="text-sm text-slate-500 mt-1">Por seguridad, debes ingresar tu contraseña actual</p>
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-center">
            <p className="font-bold">✓ Contraseña actualizada</p>
            <p className="text-sm">Redirigiendo...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contraseña Actual</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0E7490]"
              />
            </div>

            <div style={{ height: '1px', background: '#F1F5F9', margin: '20px 0' }} />

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0E7490]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0E7490]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0E7490] hover:bg-[#0C4A6E] text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 mt-4 shadow-md"
            >
              {loading ? 'Actualizando...' : 'Guardar Cambios'}
            </button>
            
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium mt-2"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CambiarContrasenaPage;
