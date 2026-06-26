import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, MapPin, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Site } from '../types';
import { useLanguage } from '../lib/LanguageContext';

export function SiteManagement() {
  const { t } = useLanguage();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteLocation, setNewSiteLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Custom dialog state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('site').select('*').order('id', { ascending: false });
      if (error) throw error;
      setSites(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    try {
      const { data, error } = await supabase.from('site').insert([{
        name: newSiteName.trim(),
        location: newSiteLocation.trim() || null
      }]).select();

      if (error) throw error;

      if (data) {
        setSites([data[0], ...sites]);
        setNewSiteName('');
        setNewSiteLocation('');
        setShowAddForm(false);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const initiateDelete = (id: number) => {
    setDeleteId(id);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    
    try {
      // First check if any labours are assigned to this site
      const { data: labours, error: laboursError } = await supabase.from('labour').select('id').eq('site_id', deleteId).limit(1);
      
      if (laboursError) throw laboursError;
      
      if (labours && labours.length > 0) {
        setDeleteError('Cannot delete this site because there are labours assigned to it. Please reassign them first.');
        return;
      }

      const { error } = await supabase.from('site').delete().eq('id', deleteId);
      if (error) throw error;

      setSites(sites.filter(site => site.id !== deleteId));
      setDeleteId(null);
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="pb-32 px-4 pt-4 w-full max-w-4xl mx-auto space-y-6">
      {/* Header section */}
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> {t('Site Management')}
          </h2>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Add or remove your operational sites
          </p>
        </div>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary/90 text-white p-2 rounded-full shadow-sm transition-all flex items-center justify-center shrink-0"
            aria-label="Add New Site"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error/10 text-error p-3 rounded-md text-sm border border-error/20 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">&times;</button>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddSite} className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-2">
             <h3 className="text-sm font-bold text-on-surface">{t('Add Site')}</h3>
             <button type="button" onClick={() => setShowAddForm(false)} className="text-on-surface-variant hover:text-on-surface text-xs font-bold font-mono">X</button>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Site Name *</label>
            <input 
              type="text" 
              required
              value={newSiteName}
              onChange={e => setNewSiteName(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-primary outline-none"
              placeholder="e.g. Skyline Tower"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Location / Address</label>
            <input 
              type="text" 
              value={newSiteLocation}
              onChange={e => setNewSiteLocation(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-primary outline-none"
              placeholder="e.g. Plot 42, Sector 15"
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full bg-primary text-white font-bold py-2 rounded shadow hover:bg-primary/90 transition-colors text-sm flex items-center justify-center gap-2">
               <Save className="w-4 h-4" /> {t('Save')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm font-medium text-on-surface-variant">Loading sites...</div>
      ) : sites.length === 0 ? (
        <div className="bg-surface-bright rounded-lg border border-outline-variant p-8 text-center shadow-sm">
          <Building2 className="w-12 h-12 text-outline-variant mx-auto mb-3" />
          <h3 className="text-sm font-bold text-on-surface">No Sites Found</h3>
          <p className="text-xs text-on-surface-variant mt-1">Add your first site to start organizing labour.</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-md uppercase tracking-wider"
          >
            {t('Add Site')}
          </button>
        </div>
      ) : (
        <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant overflow-hidden">
          <div className="divide-y divide-outline-variant/30">
            {sites.map(site => (
              <div key={site.id} className="p-4 flex justify-between items-center hover:bg-surface-container/30 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-on-surface text-sm truncate">{site.name}</h3>
                  {site.location && (
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3" /> {site.location}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => initiateDelete(site.id)}
                  className="p-2 text-error/80 hover:text-error hover:bg-error/10 rounded-full transition-colors flex shrink-0"
                  title="Delete Site"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-bright rounded-lg p-6 max-w-sm w-full shadow-lg border border-outline-variant animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-on-surface mb-2">{t('Delete')} Site</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Are you sure you want to delete this site? This action cannot be undone.
            </p>
            
            {deleteError && (
              <div className="mb-4 bg-error/10 text-error p-3 rounded-md text-xs font-medium border border-error/20">
                {deleteError}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-md transition-colors"
              >
                {t('Cancel')}
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-bold text-white bg-error hover:bg-error/90 rounded-md transition-colors"
              >
                Yes, {t('Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
