import { useState, useEffect } from 'react';
import { Search, Filter, History, IndianRupee, UserPlus, X, Edit, Trash2, Archive } from 'lucide-react';
import { ViewState, Labour, Site } from '../types';
import { supabase } from '../lib/supabase';

interface LabourListProps {
  onNavigate: (view: ViewState, ctx?: any) => void;
}

export function LabourList({ onNavigate }: Readonly<LabourListProps>) {
  const [labours, setLabours] = useState<Labour[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null);
  const [formData, setFormData] = useState({
    name: '', fatherName: '', mobile: '', idNumber: '', siteId: '', dailyRate: 0, status: 'Active'
  });

  useEffect(() => {
    fetchLabours();
    fetchSites();
  }, []);

  const fetchLabours = async () => {
    try {
      const { data, error } = await supabase
        .from('labour')
        .select('*, site(*)')
        .eq('is_archived', false)
        .order('id', { ascending: false });
        
      if (error) throw error;
      
      const formatted = (data || []).map((l: any) => ({
        ...l,
        siteName: l.site ? l.site.name : null
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
        fatherName: labour.fatherName || '',
        mobile: labour.mobile || '',
        idNumber: labour.idNumber || '',
        siteId: labour.siteId ? labour.siteId.toString() : '',
        dailyRate: labour.dailyRate || 0,
        status: labour.status || 'Active'
      });
    } else {
      setEditingLabour(null);
      setFormData({ name: '', fatherName: '', mobile: '', idNumber: '', siteId: '', dailyRate: 0, status: 'Active' });
    }
    setShowModal(true);
  };

  const saveLabour = async () => {
    console.log("saveLabour initiated", { isEdit: !!editingLabour, formData });
    try {
      const isEdit = !!editingLabour;
      
      const payload = {
        name: formData.name,
        fatherName: formData.fatherName,
        mobile: formData.mobile,
        idNumber: formData.idNumber,
        siteId: formData.siteId ? parseInt(formData.siteId) : null,
        dailyRate: formData.dailyRate,
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

  const toggleArchive = async (labour: Labour, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to archive ${labour.name}?`)) return;
    try {
      const { error } = await supabase.from('labour').update({ is_archived: true }).eq('id', labour.id);
      if (!error) {
        fetchLabours();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLabour = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Warning: Deleting will remove all payments and attendance. Are you sure?')) return;
    try {
      // Manual cascade delete emulation, since maybe foreign keys aren't cascaded
      await supabase.from('payment').delete().eq('labourId', id);
      await supabase.from('attendance').delete().eq('labourId', id);
      await supabase.from('deduction').delete().eq('labourId', id);
      const { error } = await supabase.from('labour').delete().eq('id', id);
      
      if (!error) {
        fetchLabours();
      } else { alert(error.message); }
    } catch (err) {
      console.error(err);
    }
  };


  const filteredLabours = labours.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (w.idNumber && w.idNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="pb-32 px-4 pt-4 max-w-4xl mx-auto space-y-4">
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
      </div>

      {/* Labour Directory List */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-on-surface flex items-center justify-between uppercase tracking-wide px-1">
          <span>Active Operations ({filteredLabours.filter(w => w.status === 'Active').length})</span>
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
                     <span>{worker.idNumber || 'NO ID'}</span>
                     <span>•</span>
                     <span>{worker.siteName || 'Unassigned'}</span>
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
                  <p className="text-xs font-semibold text-on-surface">₹{worker.dailyRate}/day</p>
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
                  className="p-1.5 text-on-surface-variant hover:text-orange-500 hover:bg-orange-500/10 rounded-md transition-colors"
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => deleteLabour(worker.id, e)}
                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onNavigate('payment', worker); }}
                  className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-md flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Pay
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* FAB - Add Labour */}
      <button 
        onClick={() => openForm()}
        className="fixed right-4 bottom-20 w-14 h-14 bg-primary text-white rounded-full shadow-lg border border-primary/20 flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container hover:scale-105 active:scale-95 transition-all z-[60]"
      >
        <UserPlus className="w-6 h-6" />
      </button>

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
                <input type="text" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Mobile</label>
                  <input type="text" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">ID Number</label>
                  <input type="text" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Daily Rate (₹)</label>
                  <input type="number" className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: parseFloat(e.target.value) || 0})} />
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
                <select className="w-full bg-surface-container-low border border-outline-variant p-2 rounded-md text-sm outline-none focus:border-primary" value={formData.siteId} onChange={e => setFormData({...formData, siteId: e.target.value})}>
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
    </div>
  );
}
