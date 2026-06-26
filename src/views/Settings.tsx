import { useLanguage } from '../lib/LanguageContext';

export function Settings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-24 space-y-4">
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4">
        <h2 className="text-xl font-bold text-on-surface mb-4">{t('Settings')}</h2>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-on-surface-variant">Language / भाषा</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors border ${language === 'en' ? 'bg-primary text-white border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-primary'}`}
              >
                English
              </button>
              <button 
                onClick={() => setLanguage('hi')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors border ${language === 'hi' ? 'bg-primary text-white border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-primary'}`}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
