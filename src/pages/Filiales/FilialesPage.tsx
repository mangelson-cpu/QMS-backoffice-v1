import React, { useState, useEffect } from 'react';
import { FiPlus, FiBriefcase, FiInbox } from 'react-icons/fi';

interface Filiale {
  id: string;
  nom: string;
  schema_name: string;
  createdAt: string;
}

export const FilialesPage: React.FC = () => {
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nomFiliale, setNomFiliale] = useState('');
  const [editingFiliale, setEditingFiliale] = useState<Filiale | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchFiliales = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/filiales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiliales(data.filiales || []);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des filiales', err);
    }
  };

  useEffect(() => {
    fetchFiliales();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomFiliale.trim()) return;

    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const url = editingFiliale 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/filiales/${editingFiliale.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/filiales`;
      
      const method = editingFiliale ? 'PUT' : 'POST';
      const bodyPayload = editingFiliale 
        ? { nom: nomFiliale.trim() } 
        : { nom_filiale: nomFiliale.trim() };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'opération');
      }

      setMessage(editingFiliale ? 'Filiale modifiée avec succès.' : data.message);
      setNomFiliale('');
      setEditingFiliale(null);
      fetchFiliales();
      
      setTimeout(() => {
        setIsModalOpen(false);
        setMessage('');
      }, 1500);
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingFiliale(null);
    setNomFiliale('');
    setIsModalOpen(true);
    setMessage('');
  };

  const openEditModal = (filiale: Filiale) => {
    setEditingFiliale(filiale);
    setNomFiliale(filiale.nom);
    setIsModalOpen(true);
    setMessage('');
  };

  return (
    <div className="filiales-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des filiales</h1>
          <p>Supervisez et créez de nouvelles filiales isolées (architecture multi-tenant)</p>
        </div>
        <button className="primary-gradient-btn" onClick={openCreateModal}>
          <FiPlus style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle' }} />
          Créer une filiale
        </button>
      </header>

      <div className="content-card">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nom de la Filiale</th>
              <th>Schéma BDD</th>
              <th>Date de création</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filiales.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    padding: "3.5rem 2rem",
                    color: "#94a3b8",
                  }}
                >
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                    justifyContent: "center"
                  }}>
                    <FiInbox style={{ fontSize: "3.5rem", color: "#cbd5e1" }} />
                    <span style={{ fontSize: "1.1rem", fontWeight: 500 }}>
                      Aucune filiale trouvée
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filiales.map((filiale) => (
                <tr key={filiale.id}>
                  <td className="font-bold">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiBriefcase color="var(--primary-color)" />
                      {filiale.nom}
                    </div>
                  </td>
                  <td className="text-secondary">{filiale.schema_name}</td>
                  <td className="text-secondary">
                    {new Date(filiale.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button 
                      className="icon-btn edit" 
                      title="Modifier"
                      onClick={() => openEditModal(filiale)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !loading && setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn" 
              onClick={() => {
                setIsModalOpen(false);
                setEditingFiliale(null);
                setNomFiliale('');
              }}
            >
              ×
            </button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon"><FiBriefcase style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">
                {editingFiliale ? "Modifier la Filiale" : "Nouvelle Filiale"}
              </h2>
              <p className="auth-card-subtitle">
                {editingFiliale 
                  ? "Modifiez le nom de la filiale." 
                  : "La création génèrera un schéma de base de données isolé complet."}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label className="auth-input-label">Nom de la filiale</label>
                <input
                  type="text"
                  className="auth-input"
                  value={nomFiliale}
                  onChange={(e) => setNomFiliale(e.target.value)}
                  placeholder="Ex: Baobab Sénégal"
                  required
                />
              </div>
              
              <button type="submit" className="auth-button" disabled={loading}>
                {loading 
                  ? (editingFiliale ? 'Modification...' : 'Création et génération de BDD...') 
                  : (editingFiliale ? 'Modifier la filiale' : 'Créer la filiale')}
              </button>

              {message && (
                <div 
                  className={`auth-message ${message.includes('Erreur') ? 'auth-message--error' : 'auth-message--success'}`}
                  style={{ marginTop: '1rem' }}
                >
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
