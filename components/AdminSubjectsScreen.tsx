import React from 'react';
import { ApiError } from '../services/api';
import * as api from '../services/api';

interface AdminSubjectsScreenProps {
  token: string;
  onBack: () => void;
  onSubjectsUpdated?: () => Promise<void> | void;
}

interface AdminSubjectForm {
  id: string;
  name: string;
  description: string;
}

const EMPTY_FORM: AdminSubjectForm = {
  id: '',
  name: '',
  description: '',
};

const AdminSubjectsScreen: React.FC<AdminSubjectsScreenProps> = ({ token, onBack, onSubjectsUpdated }) => {
  const [subjects, setSubjects] = React.useState<Array<{ id: string; name: string; description?: string; image_url?: string; activo?: number | boolean }>>([]);
  const [form, setForm] = React.useState<AdminSubjectForm>(EMPTY_FORM);
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadSubjects = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.fetchAdminSubjects(token);
      setSubjects(rows);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudieron cargar las asignaturas.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSelectedImageFile(null);
    setImagePreview(null);
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('No se pudo leer la imagen.'));
      };
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato invalido para imagen de asignatura. Usa JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 300 * 1024) {
      setError('La imagen no debe superar 300KB.');
      return;
    }

    setError(null);
    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!form.id.trim() && !editingId) {
      setError('El id es obligatorio.');
      return;
    }
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.updateAdminSubject(token, editingId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
        if (selectedImageFile) {
          const imageData = await fileToDataUrl(selectedImageFile);
          await api.uploadAdminSubjectImage(token, editingId, imageData);
        }
        setNotice('Asignatura actualizada.');
      } else {
        const newSubjectId = form.id.trim();
        await api.createAdminSubject(token, {
          id: newSubjectId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          activo: true,
        });
        if (selectedImageFile) {
          const imageData = await fileToDataUrl(selectedImageFile);
          await api.uploadAdminSubjectImage(token, newSubjectId, imageData);
        }
        setNotice('Asignatura creada.');
      }
      resetForm();
      await loadSubjects();
      await onSubjectsUpdated?.();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('No se pudo guardar la asignatura.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject: { id: string; name: string; description?: string; image_url?: string; activo?: number | boolean }) => {
    setEditingId(subject.id);
    setForm({
      id: subject.id,
      name: subject.name || '',
      description: subject.description || '',
    });
    setSelectedImageFile(null);
    setImagePreview(subject.image_url || null);
    setError(null);
    setNotice(null);
  };

  const handleActivate = async (subject: { id: string; name: string; description?: string; image_url?: string }) => {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.updateAdminSubject(token, subject.id, {
        name: subject.name,
        description: subject.description,
        activo: true,
      });
      setNotice('Asignatura activada.');
      await loadSubjects();
      await onSubjectsUpdated?.();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('No se pudo activar la asignatura.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subjectId: string) => {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.deleteAdminSubject(token, subjectId);
      if (editingId === subjectId) resetForm();
      setNotice('Asignatura eliminada.');
      await loadSubjects();
      await onSubjectsUpdated?.();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('No se pudo eliminar la asignatura.');
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-xl font-bold">Administrador</h1>
          <p className="text-xs text-slate-400">Gestion de asignaturas</p>
        </div>
      </header>

      <form className="space-y-3 bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 mb-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="id"
            value={form.id}
            disabled={Boolean(editingId)}
            onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
          />
          <input
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="nombre"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <textarea
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          placeholder="descripcion"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">Imagen de la asignatura</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageChange}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 px-3 text-white file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-600"
          />
          {imagePreview && (
            <img src={imagePreview} alt="Previsualizacion asignatura" className="w-full h-28 object-cover rounded-lg border border-slate-700/60" />
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-300 text-white font-bold py-2.5 rounded-xl transition-colors"
          >
            {editingId ? 'Actualizar' : 'Crear'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {(error || notice) && (
        <p
          className={`mb-4 text-sm rounded-xl px-4 py-2 border ${
            error
              ? 'text-red-400 bg-red-500/10 border-red-500/30'
              : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          {error || notice}
        </p>
      )}

      <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-4 text-sm text-slate-400">Cargando asignaturas...</p>
        ) : (
          subjects.map((subject) => (
            <div key={subject.id} className="px-4 py-3 border-b last:border-b-0 border-slate-700/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{subject.name}</p>
                  <p className="text-xs text-slate-400">{subject.id}</p>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${subject.activo ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {subject.activo ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
                {subject.image_url && (
                  <img
                    src={subject.image_url}
                    alt={subject.name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-700/60"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(subject)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-slate-700 hover:bg-slate-600"
                  >
                    Editar
                  </button>
                  {subject.activo ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(subject.id)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    >
                      Eliminar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleActivate(subject)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Activar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
};

export default AdminSubjectsScreen;
