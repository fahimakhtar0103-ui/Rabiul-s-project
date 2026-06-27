import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, Users, Coins, Building2, Calendar, FileSpreadsheet, Download, History, Loader2, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useLanguage } from '../lib/LanguageContext';

export function Reports() {
  const { t } = useLanguage();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.toISOString().slice(0, 7)); // YYYY-MM
  const [data, setData] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status map for UI loading indication of individual exports
  const [exporting, setExporting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const year = parseInt(selectedMonth.split('-')[0]);
      const month = selectedMonth.split('-')[1];
      const currentMonthDateStr = `${year}-${month}-01`;

      // Get basic stats
      const laboursRes = await supabase.from('labour').select('*, site!site_id(*)').eq('is_archived', false).order('id', { ascending: false });
      if (laboursRes.error) throw laboursRes.error;
      const activeLaboursDataRes = await supabase.from('labour').select('id, site_id').eq('is_archived', false);
      const attendanceRes = await supabase.from('attendance').select('*');
      const paymentRes = await supabase.from('payment').select('*');
      const deductionRes = await supabase.from('deduction').select('*');
      const sitesRes = await supabase.from('site').select('*');

      const attendanceData = (attendanceRes.data || []).map((a: any) => ({
        ...a,
        labour_id: a.labourId || a.labour_id
      }));

      const paymentData = (paymentRes.data || []).map((p: any) => ({
        ...p,
        labour_id: p.labourId || p.labour_id,
        payment_date: p.point_date || p.payment_date
      }));

      const deductionData = (deductionRes.data || []).map((d: any) => ({
        ...d,
        labour_id: d.labourId || d.labour_id
      }));
      
      let monthly_settlementRes: any = { data: [] };
      try { monthly_settlementRes = await supabase.from('monthly_settlement').select('*'); } catch(e) {}

      const totalLabours = laboursRes.data?.length || 0;
      const labours = laboursRes.data || [];

      // Calculate table data
      const workers = labours.map((labour: any) => {
        // Current month
        const currentAttendance = attendanceData.find(a => a.labour_id === labour.id && a.year === year && a.month.toString().padStart(2, '0') === month);
        const currentEntry = (monthly_settlementRes.data || []).find((m: any) => m.labour_id === labour.id && m.year === year && m.month === parseInt(month));
        const currentDays = (currentAttendance ? Number(currentAttendance.attendance_days) : 0) + (currentEntry ? Number(currentEntry.attendance_days || 0) : 0);
        
        const currentPayments = paymentData.filter(p => p.labour_id === labour.id && p.payment_date.toString().startsWith(selectedMonth));
        const currentDeductions = deductionData.filter(d => d.labour_id === labour.id && d.year === year && d.month.toString().padStart(2, '0') === month);

        const paymentsMade = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0) + (currentEntry ? Number(currentEntry.total_payments || 0) : 0);
        
        let ration = 0, pocketMoney = 0, otherDeductions = 0;
        currentDeductions.forEach(d => {
          ration += Number(d.ration_amount || 0);
          pocketMoney += Number(d.pocket_money_amount || 0);
          otherDeductions += Number(d.other_deduction_amount || 0);
        });

        if (currentEntry) {
          ration += Number(currentEntry.ration_amount || 0);
          pocketMoney += Number(currentEntry.pocket_money_amount || 0);
          otherDeductions += Number(currentEntry.other_deduction_amount || 0);
        }

        // Previous due
        const prevAttendance = attendanceData.filter(a => {
          const aDate = `${a.year}-${a.month.toString().padStart(2, '0')}-01`;
          return aDate < currentMonthDateStr;
        });
        const prevPayments = paymentData.filter(p => p.payment_date.toString() < currentMonthDateStr && p.labour_id === labour.id);
        const prevDeductions = deductionData.filter(d => {
          const dDate = `${d.year}-${d.month.toString().padStart(2, '0')}-01`;
          return dDate < currentMonthDateStr && d.labour_id === labour.id;
        });
        const prevEntries = (monthly_settlementRes.data || []).filter((m: any) => {
          const mDate = `${m.year}-${m.month.toString().padStart(2, '0')}-01`;
          return mDate < currentMonthDateStr && m.labour_id === labour.id;
        });

        const myPrevAttendance = prevAttendance.filter(a => a.labour_id === labour.id);
        const prevGross = myPrevAttendance.reduce((sum, a) => sum + (Number(a.attendance_days) * Number(labour.daily_rate)), 0) +
          prevEntries.reduce((sum: number, m: any) => sum + (Number(m.attendance_days || 0) * Number(m.daily_rate || labour.daily_rate)), 0);
        const prevPaid = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0) +
          prevEntries.reduce((sum: number, m: any) => sum + Number(m.total_payments || 0), 0);
        const prevDeducted = prevDeductions.reduce((sum, d) => sum + Number(d.ration_amount || 0) + Number(d.pocket_money_amount || 0) + Number(d.other_deduction_amount || 0), 0) +
          prevEntries.reduce((sum: number, m: any) => sum + Number(m.total_deductions || 0), 0);

        const previousDue = prevGross - prevPaid - prevDeducted;

        const grossSalary = Number(labour.daily_rate) * currentDays;
        const totalDeds = ration + pocketMoney + otherDeductions;
        const netSalary = grossSalary - totalDeds;
        const closingDue = previousDue + netSalary - paymentsMade;

        return {
          id: labour.id,
          name: labour.name,
          displayId: labour.id_number || 'NO ID',
          site: labour.site ? labour.site.name : 'Unassigned',
          daily_rate: Number(labour.daily_rate),
          previousDue,
          presentDays: currentDays,
          grossSalary,
          ration,
          pocketMoney,
          otherDeductions,
          netSalary,
          paymentsMade,
          closingDue,
          mobile: labour.mobile
        };
      });

      setTableData(workers);
      
      const manualActive = attendanceData.filter(a => a.year.toString() === year.toString() && a.month.toString().padStart(2, '0') === month && Number(a.attendance_days) > 0).map(a => a.labour_id);
      const entryActive = (monthly_settlementRes.data || []).filter((m: any) => m.year === year && m.month === parseInt(month) && Number(m.attendance_days) > 0).map((m: any) => m.labour_id);
      const activeLabours = new Set([...manualActive, ...entryActive]).size;

      const currentPaymentsRes = await supabase.from('payment').select('amount').like('point_date', `${selectedMonth}%`);
      const totalPayments = (currentPaymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount), 0) + 
            (monthly_settlementRes.data || []).filter((m: any) => m.year === year && m.month === parseInt(month)).reduce((sum: number, m: any) => sum + Number(m.total_payments || 0), 0);

      const currentDeductionsRes = await supabase.from('deduction').select('*').eq('year', year).eq('month', parseInt(month));
      const totalDeductions = (currentDeductionsRes.data || []).reduce((sum, d) => sum + Number(d.ration_amount || 0) + Number(d.pocket_money_amount || 0) + Number(d.other_deduction_amount || 0), 0) +
            (monthly_settlementRes.data || []).filter((m: any) => m.year === year && m.month === parseInt(month)).reduce((sum: number, m: any) => sum + Number(m.total_deductions || 0), 0);
      
      const siteSummaries = (sitesRes.data || []).map(site => {
        const count = (activeLaboursDataRes.data || []).filter(l => l.site_id === site.id).length;
        const siteWorkers = workers.filter(w => w.site === site.name);
        const totalDue = siteWorkers.reduce((acc, curr) => acc + curr.closingDue, 0);

        return {
          id: site.id,
          name: site.name,
          labourCount: count,
          totalDue
        };
      });

      setData({
        totalLabours,
        activeLabours,
        totalPayments,
        totalDeductions,
        siteSummaries
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  };

  const setExportState = (key: string, state: boolean) => {
    setExporting(prev => ({ ...prev, [key]: state }));
  };

  // --- Monthly Payroll Report Exports ---

  const exportMonthlyPayrollExcel = async () => {
    setExportState('payroll-excel', true);
    try {
      const dataToExport = tableData.map((w: any) => ({
        'ID': w.displayId,
        'Name': w.name,
        'Site': w.site,
        'Daily Rate': w.daily_rate,
        'Prev Due': w.previousDue || 0,
        'Att. Days': w.presentDays || 0,
        'Gross Salary': w.grossSalary || 0,
        'Ration': w.ration || 0,
        'Pocket Money': w.pocketMoney || 0,
        'Other Deductions': w.otherDeductions || 0,
        'Net Salary': w.netSalary || 0,
        'Payments Made': w.paymentsMade || 0,
        'Closing Due': w.closingDue || 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${selectedMonth}`);
      XLSX.writeFile(workbook, `Monthly_Payroll_Report_${selectedMonth}.xlsx`);
    } catch (err) {
      console.error("Export error", err);
    } finally {
      setExportState('payroll-excel', false);
    }
  };

  const exportMonthlyPayrollPDF = async () => {
    setExportState('payroll-pdf', true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(26, 54, 93);
      doc.text('Monthly Payroll Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${today.toLocaleString()}`, 14, 30);
      doc.text(`Billing Month: ${selectedMonth}`, 14, 35);
      
      const head = [['ID', 'Name', 'Site', 'Prev Due', 'Gross', 'Net Salary', 'Paid', 'Closing Due']];
      
      const body = tableData.map((w: any) => [
        w.displayId,
        w.name,
        w.site,
        `${(w.previousDue || 0).toLocaleString()}`,
        `${w.grossSalary.toLocaleString()}`,
        `${w.netSalary.toLocaleString()}`,
        `${(w.paymentsMade || 0).toLocaleString()}`,
        `${w.closingDue.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] }, // Primary orange
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 249, 250] }
      });

      doc.save(`Monthly_Payroll_Report_${selectedMonth}.pdf`);
    } catch (err) {
      console.error("PDF Export Error", err);
    } finally {
      setExportState('payroll-pdf', false);
    }
  };

  // --- Helpers ---

  const getDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const getEntryDate = (createdAt: any, year: number, month: number) => {
    if (createdAt && typeof createdAt === 'string' && createdAt.includes('T')) {
      return createdAt.split('T')[0];
    }
    const todayNum = new Date();
    if (todayNum.getFullYear() === year && todayNum.getMonth() + 1 === month) {
      return todayNum.toISOString().split('T')[0];
    }
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  };

  const getUniversalPaymentHistory = async () => {
    let payments: any[] = [];
    let monthly_settlement: any[] = [];

    // Fetch payments
    const paymentsRes = await supabase.from('payment').select('*, labour!labour_id(name, id_number)');
    if (paymentsRes.error) {
      // Fallback: Fetch payment and labour separately and map
      const pRes = await supabase.from('payment').select('*');
      if (pRes.error) throw pRes.error;
      const lRes = await supabase.from('labour').select('id, name, id_number');
      if (lRes.error) throw lRes.error;
      
      const labourMap = new Map(lRes.data.map(l => [l.id, l]));
      payments = (pRes.data || []).map(p => {
        const actualLabourId = p.labourId || p.labour_id;
        const actualPaymentDate = p.point_date || p.payment_date;
        return {
          ...p,
          labour_id: actualLabourId,
          payment_date: actualPaymentDate,
          labour: labourMap.get(actualLabourId) || null
        };
      });
    } else {
      payments = paymentsRes.data || [];
    }

    // Fetch monthly settlements
    const settlementRes = await supabase.from('monthly_settlement').select('*, labour!labour_id(name, id_number)');
    if (settlementRes.error) {
      // Fallback: Fetch settlement and labour separately and map
      const msRes = await supabase.from('monthly_settlement').select('*');
      if (msRes.error) throw msRes.error;
      const lRes = await supabase.from('labour').select('id, name, id_number');
      if (lRes.error) throw lRes.error;
      
      const labourMap = new Map(lRes.data.map(l => [l.id, l]));
      monthly_settlement = (msRes.data || []).map(m => ({
        ...m,
        labour: labourMap.get(m.labour_id) || null
      }));
    } else {
      monthly_settlement = settlementRes.data || [];
    }
    
    let combined: any[] = [];
    if (payments) {
      combined = [...combined, ...payments.map(p => ({
        date: p.payment_date,
        id_number: p.labour?.id_number || '',
        name: p.labour?.name || '',
        amount: Number(p.amount),
        mode: p.mode || 'Cash',
        notes: p.notes || ''
      }))];
    }
    if (monthly_settlement) {
      combined = [...combined, ...monthly_settlement.filter(m => Number(m.total_payments) > 0).map(m => ({
        date: getEntryDate(m.created_at, m.year, m.month),
        id_number: m.labour?.id_number || '',
        name: m.labour?.name || '',
        amount: Number(m.total_payments),
        mode: 'Settlement',
        notes: `Monthly Settlement - ${m.year}-${m.month.toString().padStart(2, '0')}`
      }))];
    }
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  };

  // --- Labour History Report Exports ---

  const exportLabourHistoryExcel = async () => {
    setExportState('history-excel', true);
    try {
      const combined = await getUniversalPaymentHistory();
      const dataToExport = combined.map(c => ({
        'Date': getDisplayDate(c.date),
        'Labour ID': c.id_number,
        'Labour Name': c.name,
        'Payment Mode': c.mode,
        'Amount': c.amount,
        'Notes': c.notes
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payment_History");
      XLSX.writeFile(workbook, `Labour_Payment_History_${selectedMonth}.xlsx`);
    } catch (err: any) {
      console.error("Export error", err);
      setError("Failed to generate Labour History Excel: " + err.message);
    } finally {
      setExportState('history-excel', false);
    }
  };

  const exportLabourHistoryPDF = async () => {
    setExportState('history-pdf', true);
    try {
      const combined = await getUniversalPaymentHistory();
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(26, 54, 93);
      doc.text('Labour Payment History Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${today.toLocaleString()}`, 14, 30);
      
      const head = [['Date', 'ID', 'Name', 'Mode', 'Amount', 'Notes']];
      const body = combined.map(c => [
        getDisplayDate(c.date),
        c.id_number || '-',
        c.name || 'Unknown',
        c.mode,
        `${c.amount.toLocaleString()}`,
        c.notes
      ]);

      autoTable(doc, {
        startY: 40,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] },
        styles: { fontSize: 8 },
      });

      doc.save(`Labour_Payment_History_${selectedMonth}.pdf`);
    } catch (err: any) {
      console.error("PDF Export Error", err);
      setError("Failed to generate Labour History PDF: " + err.message);
    } finally {
      setExportState('history-pdf', false);
    }
  };

  // --- Site Wise Report Exports ---

  const exportSiteWiseExcel = async () => {
    setExportState('site-excel', true);
    try {
      if (!data || !data.siteSummaries) throw new Error("No site data available.");
      
      const dataToExport = data.siteSummaries.map((s: any) => ({
        'Site ID': s.id,
        'Site Name': s.name,
        'Total Labours': s.labourCount,
        'Outstanding Due': s.totalDue
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Site_Wise_Report");
      XLSX.writeFile(workbook, `Site_Wise_Report_${selectedMonth}.xlsx`);
    } catch (err: any) {
      console.error("Export error", err);
      setError("Failed to generate Site Wise Excel: " + err.message);
    } finally {
      setExportState('site-excel', false);
    }
  };

  const exportSiteWisePDF = async () => {
    setExportState('site-pdf', true);
    try {
      if (!data || !data.siteSummaries) throw new Error("No site data available.");
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(26, 54, 93);
      doc.text('Site Wise Summary Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${today.toLocaleString()}`, 14, 30);
      doc.text(`Billing Month: ${selectedMonth}`, 14, 35);
      
      const head = [['Site Name', 'Total Labours', 'Total Outstanding Due']];
      const body = data.siteSummaries.map((s: any) => [
        s.name,
        s.labourCount.toString(),
        `${s.totalDue.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] },
        styles: { fontSize: 10 },
      });

      doc.save(`Site_Wise_Report_${selectedMonth}.pdf`);
    } catch (err: any) {
      console.error("PDF Export Error", err);
      setError("Failed to generate Site Wise PDF: " + err.message);
    } finally {
      setExportState('site-pdf', false);
    }
  };

  // --- Outstanding Due Report Exports ---

  const exportOutstandingExcel = async () => {
    setExportState('out-excel', true);
    try {
      const outstandingWorkers = tableData.filter(w => w.closingDue > 0).sort((a, b) => b.closingDue - a.closingDue);
      
      const dataToExport = outstandingWorkers.map((w: any) => ({
        'ID': w.displayId,
        'Name': w.name,
        'Mobile': w.mobile || '',
        'Site': w.site,
        'Outstanding Balance': w.closingDue
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Outstanding_Dues");
      XLSX.writeFile(workbook, `Outstanding_Due_Report_${selectedMonth}.xlsx`);
    } catch (err: any) {
        console.error("Export error", err);
        setError("Failed to generate Outstanding Due Excel: " + err.message);
    } finally {
        setExportState('out-excel', false);
    }
  };

  const exportOutstandingPDF = async () => {
    setExportState('out-pdf', true);
    try {
      const outstandingWorkers = tableData.filter(w => w.closingDue > 0).sort((a, b) => b.closingDue - a.closingDue);
      const totalOutstanding = outstandingWorkers.reduce((acc, curr) => acc + curr.closingDue, 0);

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(26, 54, 93);
      doc.text('Outstanding Due Ledger', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${today.toLocaleString()}`, 14, 30);
      doc.text(`Total Deficit: Rs. ${totalOutstanding.toLocaleString()}`, 14, 35);
      
      const head = [['ID', 'Name', 'Site', 'Contact', 'Outstanding Amount']];
      const body = outstandingWorkers.map((w: any) => [
        w.displayId,
        w.name,
        w.site,
        w.mobile || '-',
        `${w.closingDue.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] }, // Red for outstanding
        styles: { fontSize: 9 },
      });

      doc.save(`Outstanding_Due_Report_${selectedMonth}.pdf`);
    } catch (err: any) {
        console.error("PDF Export Error", err);
        setError("Failed to generate Outstanding Due PDF: " + err.message);
    } finally {
        setExportState('out-pdf', false);
    }
  };

  return (
    <div className="pb-32 w-full mx-auto print:pb-0 print:pt-0 print:px-0 print:bg-white print:text-black">
      {/* ===== ON-SCREEN UI ===== */}
      <div className="px-4 pt-4 space-y-6 print:hidden">
        {/* Header section */}
        <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-on-surface tracking-tight">{t('Reports')} & Ledgers</h2>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              Financial, Operational & Ledger Exports
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-on-surface-variant" />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              className="text-sm font-bold bg-surface-container border border-outline-variant rounded p-1.5 focus:border-primary outline-none"
            />
          </div>
        </div>

        {error && (
            <div className="p-4 bg-error/10 border border-error/20 text-error rounded-lg flex items-start gap-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
        )}

        {loading ? (
          <div className="p-12 text-center flex items-center justify-center gap-3 text-sm font-bold text-on-surface-variant animate-pulse">
             <Loader2 className="w-5 h-5 animate-spin text-primary" /> Syncing Universal Data...
          </div>
        ) : data && tableData.length > 0 ? (
          <div className="space-y-6">
            
            {/* Report Export Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Monthly Payroll Report */}
                <div className="bg-surface-bright border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-5 h-5"/>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-on-surface tracking-tight">{t('Monthly Payroll')} Report</h3>
                            <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                                Complete aggregate of operations, salary generation, and deductions for {selectedMonth}.
                            </p>
                        </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-outline-variant/30 grid grid-cols-2 gap-3">
                        <button 
                            disabled={exporting['payroll-pdf']}
                            onClick={exportMonthlyPayrollPDF}
                            className="bg-primary hover:bg-primary/90 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                        >
                            {exporting['payroll-pdf'] ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/> }
                            {t('Export PDF')}
                        </button>
                        <button 
                            disabled={exporting['payroll-excel']}
                            onClick={exportMonthlyPayrollExcel}
                            className="bg-[#107C41] hover:bg-[#107C41]/90 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                        >
                            {exporting['payroll-excel'] ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4"/> }
                            {t('Export Excel')}
                        </button>
                    </div>
                </div>

                {/* 2. Labour History Report */}
                <div className="bg-surface-bright border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                            <History className="w-5 h-5"/>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-on-surface tracking-tight">Labour History Report</h3>
                            <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                                Universal ledger tracking all historic transactions, modes, and notes.
                            </p>
                        </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-outline-variant/30 grid grid-cols-2 gap-3">
                        <button 
                             disabled={exporting['history-pdf']}
                             onClick={exportLabourHistoryPDF}
                             className="bg-primary hover:bg-primary/90 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                        >
                           {exporting['history-pdf'] ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/> }
                           {t('Export PDF')}
                        </button>
                        <button 
                             disabled={exporting['history-excel']}
                             onClick={exportLabourHistoryExcel}
                             className="bg-[#107C41] hover:bg-[#107C41]/90 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                        >
                           {exporting['history-excel'] ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4"/> }
                           {t('Export Excel')}
                        </button>
                    </div>
                </div>

                {/* 3. Site Wise Report */}
                <div className="bg-surface-bright border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5"/>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-on-surface tracking-tight">Site Wise Report</h3>
                            <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                                Resource distribution and operational outstanding balances segmented per operational site.
                            </p>
                        </div>
                    </div>
                     <div className="mt-auto pt-4 border-t border-outline-variant/30 grid grid-cols-2 gap-3">
                        <button 
                             disabled={exporting['site-pdf']}
                             onClick={exportSiteWisePDF}
                             className="bg-primary hover:bg-primary/90 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                        >
                           {exporting['site-pdf'] ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/> }
                           {t('Export PDF')}
                        </button>
                        <button 
                             disabled={exporting['site-excel']}
                             onClick={exportSiteWiseExcel}
                             className="bg-[#107C41] hover:bg-[#107C41]/90 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                        >
                           {exporting['site-excel'] ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4"/> }
                           {t('Export Excel')}
                        </button>
                    </div>
                </div>

                {/* 4. Outstanding Due Report */}
                <div className="bg-error/5 border border-error/20 rounded-xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-error/10 rounded-full blur-2xl"></div>
                    <div className="flex items-start gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
                            <TrendingDown className="w-5 h-5"/>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-error tracking-tight">Outstanding Due Ledger</h3>
                            <p className="text-xs text-error/80 mt-1 leading-snug">
                                Aggregate of all unpaid balances currently owed to active and legacy labours.
                            </p>
                        </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-error/20 grid grid-cols-2 gap-3 relative z-10">
                        <button 
                             disabled={exporting['out-pdf']}
                             onClick={exportOutstandingPDF}
                             className="bg-error hover:bg-error/90 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                        >
                           {exporting['out-pdf'] ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/> }
                           {t('Export PDF')}
                        </button>
                        <button 
                             disabled={exporting['out-excel']}
                             onClick={exportOutstandingExcel}
                             className="bg-[#107C41] hover:bg-[#107C41]/90 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                        >
                           {exporting['out-excel'] ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4"/> }
                           {t('Export Excel')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Snapshot */}
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mt-8 mb-4">Quick Insights</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-bright border border-outline-variant rounded-lg p-4 shadow-sm">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide block mb-2">{t('Total Labour')}</span>
                <h3 className="text-xl font-black text-on-surface">{data.totalLabours}</h3>
              </div>
              <div className="bg-surface-bright border border-outline-variant rounded-lg p-4 shadow-sm">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide block mb-2">Active This Month</span>
                <h3 className="text-xl font-black text-on-surface">{data.activeLabours}</h3>
              </div>
              <div className="bg-success/5 border border-success/20 rounded-lg p-4 shadow-sm">
                <span className="text-[10px] font-bold text-success uppercase tracking-wide block mb-2">{t('Total Payments')}</span>
                <h3 className="text-xl font-black text-success">₹{(data.totalPayments || 0).toLocaleString()}</h3>
              </div>
               <div className="bg-error/5 border border-error/20 rounded-lg p-4 shadow-sm">
                <span className="text-[10px] font-bold text-error uppercase tracking-wide block mb-2">{t('Total Deductions')}</span>
                <h3 className="text-xl font-black text-error">₹{(data.totalDeductions || 0).toLocaleString()}</h3>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-sm font-medium text-on-surface-variant border border-dashed border-outline-variant rounded-lg">
              No operational data or history found for this period.
          </div>
        )}
      </div>
    </div>
  );
}

