import React, { useState, useEffect } from 'react';
import { Search, Filter, History, IndianRupee, UserPlus, X, Edit, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { ViewState, Labour, Site } from '../types';
import { supabase } from '../lib/supabase';

interface LabourListProps {
  onNavigate: (view: ViewState, ctx?: any) => void;
}

export function LabourList({ onNavigate }: Readonly<LabourListProps>) {
  const [labours, setLabours] = useState<Labour[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null);
  const [formData, setFormData] = useState({
    name: '', father_name: '', mobile: '', id_number: '', site_id: '', daily_rate: 0, status: 'Active'
  });
  
  const [activeModal, setActiveModal] = useState<{id: number, name: string, type: 'delete' | 'archive' | 'unarchive'} | null>(null);

  useEffect(() => {
    fetchLabours();
    fetchSites();
  }, [showArchived]);

  const fetchLabours = async () => {
    try {
      const { data, error } = await supabase
        .from('labour')
        .select('*, site(*)')
        .eq('is_archived', showArchived)
        .order('id', { ascending: false });
        
      if (error) throw error;
      
      const formatted = (data || []).map((l: any) => ({
        ...l,
        site_name: l.site ? l.site.name : null
      }));
      setLabours(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase.from('site').select('*');
      if (error) throw error;
      setSites(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openForm = (labour?: Labour) => {
    if (labour) {
      setEditingLabour(labour);
      setFormData({
        name: labour.name,
        father_name: labour.father_name || '',
        mobile: labour.mobile || '',
        id_number: labour.id_number || '',
        site_id: labour.site_id ? labour.site_id.toString() : '',
        daily_rate: labour.daily_rate || 0,
        status: labour.status || 'Active'
      });
    } else {
      setEditingLabour(null);
      setFormData({ name: '', father_name: '', mobile: '', id_number: '', site_id: '', daily_rate: 0, status: 'Active' });
    }
    setShowModal(true);
  };

  const saveLabour = async () => {
    console.log("saveLabour initiated", { isEdit: !!editingLabour, formData });
    try {
      const isEdit = !!editingLabour;
      
      const payload = {
        name: formData.name,
        father_name: formData.father_name,
        mobile: formData.mobile,
        id_number: formData.id_number,
        site_id: formData.site_id ? parseInt(formData.site_id) : null,
        daily_rate: formData.daily_rate,
        status: formData.status,
        role: 'Labour',
        is_archived: false
      };
      
      let error;
      if (isEdit && editingLabour) {
        const result = await supabase.from('labour').update(payload).eq('id', editingLabour.id);
        error = result.error;
      } else {
        const result = await supabase.from('labour').insert([payload]);
        error = result.error;
      }

      if (!error) {
        console.log("Save successful, closing modal and refreshing");
        setShowModal(false);
        fetchLabours();
      } else {
        console.error("Save failed with error from API:", error.message);
        alert(error.message);
      }
    } catch (err) {
      console.error("Network or parsing error in saveLabour:", err);
    }
  };

  const executeAction = async () => {
    if (!activeModal) return;
    try {
      if (activeModal.type === 'archive') {
        const { error } = await supabase.from('labour').update({ is_archived: true }).eq('id', activeModal.id);
        if (!error) fetchLabours();
      } else if (activeModal.type === 'unarchive') {
        const { error } = await supabase.from('labour').update({ is_archived: false }).eq('id', activeModal.id);
        if (!error) fetchLabours();
      } else if (activeModal.type === 'delete') {
        await supabase.from('payment').delete().eq('labour_id', activeModal.id);
        await supabase.from('attendance').delete().eq('labour_id', activeModal.id);
        await supabase.from('deduction').delete().eq('labour_id', activeModal.id);
        await supabase.from('monthly_settlement').delete().eq('labour_id', activeModal.id);
        const { error } = await supabase.from('labour').delete().eq('id', activeModal.id);
        if (!error) fetchLabours();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActiveModal(null);
    }
  };

  const toggleArchive = (labour: Labour, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveModal({ id: labour.id, name: labour.name, type: labour.is_archived ? 'unarchive' : 'archive' });
  };

  const deleteLabour = (worker: Labour, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveModal({ id: worker.id, name: worker.name, type: 'delete' });
  };


  const filteredLabours = labours.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (w.id_number && w.id_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full pb-32 px-4 pt-4 max-w-4xl mx-auto space-y-4">
      {/* Header section */}
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4">
        <h2 className="text-xl font-bold text-on-surface tracking-tight">Labours Directory</h2>
        <p className="text-xs text-on-surface-variant font-medium mt-1">Manage profiles, track dues & view history</p>

        <div className="flex gap-2 mt-4 items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all" 
            />
          </div>
        </div>
        
        {/* Toggle between Active and Archived */}
        <div className="flex gap-2 mt-4 border-b border-outline-variant">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${!showArchived ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            Active Labours
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${showArchived ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Labour Directory List */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-on-surface flex items-center justify-between uppercase tracking-wide px-1">
          <span>{showArchived ? 'Archived Records' : `Active Operations (${filteredLabours.filter(w => w.status === 'Active').length})`}</span>
          <span className="text-[10px] font-bold text-on-surface-variant px-2 py-0.5 bg-surface-container rounded-full border border-outline-variant/50">{filteredLabours.length} Found</span>
        </h3>

        {filteredLabours.map((worker) => (
          <div key={worker.id} className="bg-surface-bright border border-outline-variant rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none" onClick={() => onNavigate('profile', worker)}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-3">
                 <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold border border-primary/20 shrink-0 uppercase">
                  {worker.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-bold text-on-surface tracking-tight">{worker.name}</h4>
                  <div className="text-[10px] text-on-surface-variant font-semibold flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
                     <span>{worker.id_number || 'NO ID'}</span>
                     <span>•</span>
                     <span>{worker.site_name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                worker.status === 'Active' ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'
              }`}>
                {worker.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2 bg-surface-container-low/50 rounded-md border border-outline-variant/30 mb-3">
               <div>
                  <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Contact</p>
                  <p className="text-xs font-semibold text-on-surface">{worker.mobile || 'N/A'}</p>
               </div>
               <div>
                  <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Daily Rate</p>
                  <p className="text-xs font-semibold text-on-surface">₹{worker.daily_rate}/day</p>
               </div>
            </div>

            <div className="flex items-end justify-between border-t border-outline-variant/60 pt-3">
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); openForm(worker); }}
                  className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => toggleArchive(worker, e)}
                  className={`p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-md transition-colors`}
                  title={worker.is_archived ? "Unarchive" : "Archive"}
                >
                  {worker.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
                <button 
                  onClick={(e) => deleteLabour(worker, e)}
                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {!worker.is_archived && (
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onNavigate('payment', worker); }}
                    className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-md flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
                  >
                    <IndianRupee className="w-3.5 h-3.5" /> Pay
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* FAB - Add Labour (only in active tab) */}
      {!showArchived && (
        <button 
          onClick={() => openForm()}
          className="fixed right-4 bottom-20 w-14 h-14 bg-primary text-white rounded-full shadow-lg border border-primary/20 flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container hover:scale-105 active:scale-95 transition-all z-[60]"
        >
          <UserPlus className="w-6 h-6" />
        </button>
      )}

      {/* Modal / Slide-up Form */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 animate-in fade-in">
          <div className="bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl border border-outline-variant max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-outline-variant sticky top-0 bg-surface z-10">
              <h3 className="font-bold text-lg">{editingLabour ? 'Edit Labour' : 'Add Labour'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-container rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 space-y-4 flex-grow">
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">Full Name</label>
                <input type="text" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">Father's Name</label>
                <input type="text" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Mobile</label>
                  <input type="text" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">ID Number</label>
                  <input type="text" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.id_number} onChange={e => setFormData({...formData, id_number: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Daily Rate (₹)</label>
                  <input type="number" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.daily_rate} onChange={e => setFormData({...formData, daily_rate: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Status</label>
                  <select className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">Assign Site</label>
                <select className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.site_id} onChange={e => setFormData({...formData, site_id: e.target.value})}>
                  <option value="">Unassigned</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.location})</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-outline-variant bg-surface-container-low sticky bottom-0">
              <button onClick={saveLabour} className="w-full bg-primary text-white font-bold py-2.5 rounded-lg active:scale-95 transition-transform" disabled={!formData.name}>
                {editingLabour ? 'Save Changes' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete/Archive Confirmation Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-bright rounded-lg p-6 max-w-sm w-full shadow-lg border border-outline-variant animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-on-surface mb-2">
              {activeModal.type === 'archive' ? 'Archive Labour' : 
               activeModal.type === 'unarchive' ? 'Restore Labour' :
               'Delete Labour'}
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {activeModal.type === 'archive' 
                ? `Are you sure you want to archive ${activeModal.name}? They will no longer appear in the active list.`
                : activeModal.type === 'unarchive'
                ? `Are you sure you want to restore ${activeModal.name} to the active list?`
                : `Are you sure you want to completely delete ${activeModal.name}? This will remove all their payments and attendance history.`}
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeAction}
                className={`px-4 py-2 text-sm font-bold text-white rounded-md transition-colors ${
                  activeModal.type === 'archive' ? 'bg-orange-500 hover:bg-orange-600' : 
                  activeModal.type === 'unarchive' ? 'bg-success hover:bg-success/90' :
                  'bg-error hover:bg-error/90'
                }`}
              >
                {activeModal.type === 'archive' ? 'Archive' : 
                 activeModal.type === 'unarchive' ? 'Restore' :
                 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
