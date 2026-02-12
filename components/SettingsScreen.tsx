import React from 'react';
import { AuthUser } from '../types';

interface SettingsScreenProps {
  userData?: AuthUser | null;
  onBack: () => void;
  onUploadProfilePic: (file: File) => Promise<string>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ userData, onBack, onUploadProfilePic, onChangePassword }) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = React.useState(userData?.profile_pic || 'https://picsum.photos/seed/default-profile/200');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setPreviewSrc(userData?.profile_pic || 'https://picsum.photos/seed/default-profile/200');
  }, [userData?.profile_pic]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato invalido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 100 * 1024) {
      setError('La imagen no debe superar los 100 Kb');
      return;
    }

    setError(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setError('Ingresa tu contrasena actual para cambiarla.');
        return;
      }
      if (newPassword.length < 6) {
        setError('La nueva contrasena debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('La nueva contrasena y su confirmacion no coinciden.');
        return;
      }
    }

    const wantsPasswordChange = Boolean(newPassword || confirmPassword || currentPassword);
    let photoUpdated = false;
    let passwordUpdated = false;

    try {
      setIsSaving(true);
      if (selectedFile) {
        await onUploadProfilePic(selectedFile);
        photoUpdated = true;
      }
      if (wantsPasswordChange) {
        await onChangePassword(currentPassword, newPassword);
        passwordUpdated = true;
      }
      if (photoUpdated && passwordUpdated) {
        setNotice('Foto y contrasena actualizadas correctamente.');
      } else if (photoUpdated) {
        setNotice('Foto de perfil actualizada correctamente.');
      } else if (passwordUpdated) {
        setNotice('Contrasena actualizada correctamente.');
      } else {
        setNotice('No hay cambios para guardar.');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudieron guardar los cambios.');
    } finally {
      setIsSaving(false);
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <main className="flex-1 px-6 pt-6 pb-10">
      <header className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl border border-slate-700/60 bg-slate-800/50 text-slate-300 hover:text-white hover:border-primary/50 transition-colors"
          aria-label="Volver"
          title="Volver"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
        </button>
        <div className="text-right">
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-xs text-slate-400">Configura tu cuenta</p>
        </div>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Foto de perfil</h2>
          <div className="flex items-center gap-4 mb-4">
            <img
              src={previewSrc}
              alt="Vista previa del perfil"
              className="w-16 h-16 rounded-full object-cover border-2 border-primary"
            />
            <div>
              <p className="font-semibold">{userData?.name || 'Usuario'}</p>
              <p className="text-xs text-slate-400">{userData?.email || 'Sin email'}</p>
            </div>
          </div>
          <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 ml-1">
            Subir foto
          </label>
          <input
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
          />
        </section>

        <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Cambiar contrasena</h2>
          <div className="space-y-3">
            <input
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              placeholder="Contrasena actual"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
            <input
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              placeholder="Nueva contrasena"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
            <input
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              placeholder="Confirmar nueva contrasena"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
        </section>

        {(error || notice) && (
          <p
            className={`text-sm rounded-xl px-4 py-2 border ${
              error
                ? 'text-red-400 bg-red-500/10 border-red-500/30'
                : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            {error || notice}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-primary hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-300 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 transition-all transform active:scale-[0.98]"
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </main>
  );
};

export default SettingsScreen;
