import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api'; // ✅ Importa tu instancia de Axios
import './Repairs.css';

// ... (El resto de tus importaciones y la constante REPAIR_TYPES)

function Repairs() {
    // ... (Tus estados se mantienen iguales)

    // 1. Cargar vehículos con api.get
    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const res = await api.get('/api/vehicles/my');
                setVehicles(res.data.vehicles || []);
            } catch (err) {
                console.error('Error cargando vehículos:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchVehicles();
    }, []);

    // 2. Cargar reparaciones con api.get
    const fetchRepairs = async (vehicleId) => {
        setLoadingRepairs(true);
        try {
            const res = await api.get(`/api/repairs/vehicle/${vehicleId}`);
            setRepairs(res.data.repairs || []);
        } catch (err) {
            console.error('Error cargando reparaciones:', err);
        } finally {
            setLoadingRepairs(false);
        }
    };

    // 3. Guardar reparación (Crear o Editar)
    const handleSave = async () => {
        try {
            if (editingRepair) {
                await api.put(`/api/repairs/${editingRepair._id}`, form);
            } else {
                await api.post('/api/repairs', { ...form, vehicleId: selectedVehicle._id });
            }
            setShowModal(false);
            fetchRepairs(selectedVehicle._id);
        } catch (err) {
            console.error('Error guardando reparación:', err);
        }
    };

    // 4. Eliminar reparación con api.delete
    const handleDelete = async (repairId) => {
        if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
        try {
            await api.delete(`/api/repairs/${repairId}`);
            fetchRepairs(selectedVehicle._id);
        } catch (err) {
            console.error('Error eliminando reparación:', err);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="dashboard-container">
            <Sidebar activePage="repairs" />

            <div className="main-content">
                <div className="topbar">
                    <h1>🔧 Cuaderno de Reparaciones</h1>
                    <p>Registra y consulta el historial de mantenimiento de cada uno de tus vehículos.</p>
                </div>

                {loading ? (
                    <div className="loading-container" style={{ minHeight: '40vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#00ff88', fontSize: '1.1rem', fontWeight: 700 }}>
                        CARGANDO VEHÍCULOS...
                    </div>
                ) : !selectedVehicle ? (
                    /* ===== VISTA 1: LISTA DE VEHÍCULOS ===== */
                    <>
                        {vehicles.length === 0 ? (
                            <div className="repair-empty">
                                <div className="repair-empty-icon">🚗</div>
                                <h3 style={{ color: '#e2e8f0' }}>No tienes vehículos registrados</h3>
                                <p>Registra un auto primero para empezar a llevar tu cuaderno de reparaciones.</p>
                            </div>
                        ) : (
                            <div className="repairs-grid">
                                {vehicles.map((v) => (
                                    <div key={v._id} className="repair-vehicle-card" onClick={() => selectVehicle(v)}>
                                        <div className="vehicle-icon">🚗</div>
                                        <div className="vehicle-info">
                                            <h3>{v.brand} {v.model}</h3>
                                            <p>Año: {v.year}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    /* ===== VISTA 2: CUADERNO DEL VEHÍCULO ===== */
                    <div className="repair-detail">
                        <button className="repair-back-btn" onClick={goBack}>
                            ← Volver a mis vehículos
                        </button>

                        <div className="repair-vehicle-banner">
                            <div>
                                <h2>🚗 {selectedVehicle.brand} {selectedVehicle.model}</h2>
                                <span>Año: {selectedVehicle.year}</span>
                            </div>
                            <button className="add-repair-btn" onClick={openNewRepair}>
                                + Nuevo Registro
                            </button>
                        </div>

                        {loadingRepairs ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#00ff88', fontWeight: 700 }}>
                                CARGANDO HISTORIAL...
                            </div>
                        ) : repairs.length === 0 ? (
                            <div className="repair-empty">
                                <div className="repair-empty-icon">📋</div>
                                <h3 style={{ color: '#e2e8f0' }}>Cuaderno vacío</h3>
                                <p>Aún no has registrado ningún cambio ni mantenimiento para este vehículo.</p>
                                <button className="add-repair-btn" onClick={openNewRepair} style={{ marginTop: '1rem' }}>
                                    + Registrar primer cambio
                                </button>
                            </div>
                        ) : (
                            <div className="repair-timeline">
                                {repairs.map((r) => (
                                    <div key={r._id} className="repair-entry">
                                        <div className="repair-entry-header">
                                            <h4 className="repair-entry-type">🔧 {r.type}</h4>
                                            <span className="repair-entry-date">{formatDate(r.repairDate)}</span>
                                        </div>

                                        {r.description && (
                                            <p className="repair-entry-desc">{r.description}</p>
                                        )}

                                        <div className="repair-entry-meta">
                                            {r.mileageKm > 0 && (
                                                <div className="repair-meta-item">
                                                    <span className="repair-meta-label">Kilometraje</span>
                                                    <span className="repair-meta-value">{r.mileageKm.toLocaleString()} km</span>
                                                </div>
                                            )}
                                            {r.cost > 0 && (
                                                <div className="repair-meta-item">
                                                    <span className="repair-meta-label">Costo</span>
                                                    <span className="repair-meta-value">S/ {r.cost.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {r.workshopName && (
                                                <div className="repair-meta-item">
                                                    <span className="repair-meta-label">Taller</span>
                                                    <span className="repair-meta-value">{r.workshopName}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="repair-entry-actions">
                                            <button className="repair-action-btn" onClick={() => openEditRepair(r)}>
                                                ✏️ Editar
                                            </button>
                                            <button className="repair-action-btn delete" onClick={() => handleDelete(r._id)}>
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== MODAL: Agregar / Editar ===== */}
                {showModal && (
                    <div className="repair-modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="repair-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>{editingRepair ? '✏️ Editar Registro' : '➕ Nuevo Registro de Mantenimiento'}</h3>

                            <div className="repair-form-group">
                                <label>Tipo de Cambio / Reparación</label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    {REPAIR_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="repair-form-group">
                                <label>Descripción / Notas</label>
                                <textarea
                                    placeholder="Ej: Se cambió aceite 10W-40 sintético, filtro nuevo Mann..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="repair-form-row">
                                <div className="repair-form-group">
                                    <label>Kilometraje Actual</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 45000"
                                        value={form.mileageKm}
                                        onChange={(e) => setForm({ ...form, mileageKm: e.target.value })}
                                    />
                                </div>
                                <div className="repair-form-group">
                                    <label>Costo (S/)</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 250.00"
                                        value={form.cost}
                                        onChange={(e) => setForm({ ...form, cost: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="repair-form-row">
                                <div className="repair-form-group">
                                    <label>Taller / Mecánico</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Taller Don Pedro"
                                        value={form.workshopName}
                                        onChange={(e) => setForm({ ...form, workshopName: e.target.value })}
                                    />
                                </div>
                                <div className="repair-form-group">
                                    <label>Fecha del Cambio</label>
                                    <input
                                        type="date"
                                        value={form.repairDate}
                                        onChange={(e) => setForm({ ...form, repairDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="repair-modal-actions">
                                <button className="repair-modal-cancel" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button className="repair-modal-save" onClick={handleSave}>
                                    {editingRepair ? 'Guardar Cambios' : 'Registrar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Repairs;
