import express from 'express';
import { query } from '../db';

const router = express.Router();

router.get('/site', async (req, res) => {
  try {
    const result = await query('SELECT * FROM site');
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/labour', async (req, res) => {
  try {
    const siteId = req.query.siteId as string;
    const includeArchived = req.query.includeArchived === 'true';
    
    let sql = `
      SELECT l.*, s.name as "siteName" 
      FROM labour l
      LEFT JOIN site s ON l."siteId" = s.id
      WHERE 1=1
    `;
    let params: any[] = [];
    let paramIndex = 1;

    if (!includeArchived) {
      sql += ` AND l.is_archived = false`;
    }

    if (siteId) {
      sql += ` AND l."siteId" = $${paramIndex}`;
      params.push(siteId);
      paramIndex++;
    }
    
    sql += ` ORDER BY l.id DESC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/labour', async (req, res) => {
  try {
    const { name, fatherName, mobile, idNumber, siteId, dailyRate, status, role } = req.body;
    const result = await query(`
      INSERT INTO labour (name, "fatherName", mobile, "idNumber", "siteId", "dailyRate", status, role, is_archived)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
      RETURNING *;
    `, [name, fatherName, mobile, idNumber, siteId || null, dailyRate || 0, status || 'Active', role || 'Labour']);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/labour/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fatherName, mobile, idNumber, siteId, dailyRate, status, role, is_archived } = req.body;
    const result = await query(`
      UPDATE labour 
      SET name = $1, "fatherName" = $2, mobile = $3, "idNumber" = $4, "siteId" = $5, "dailyRate" = $6, status = $7, role = $8, is_archived = $9
      WHERE id = $10
      RETURNING *;
    `, [name, fatherName, mobile, idNumber, siteId || null, dailyRate || 0, status || 'Active', role || 'Labour', is_archived || false, id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/labour/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get labour details
    const labourRes = await query(`
      SELECT l.*, s.name as "siteName" 
      FROM labour l
      LEFT JOIN site s ON l."siteId" = s.id
      WHERE l.id = $1
    `, [id]);
    
    if (labourRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    const labour = labourRes.rows[0];

    // Get attendance, payments, deductions
    const attendanceRes = await query(`SELECT * FROM attendance WHERE "labourId" = $1 ORDER BY year DESC, month DESC`, [id]);
    const paymentRes = await query(`SELECT * FROM payment WHERE "labourId" = $1 ORDER BY point_date DESC`, [id]);
    const deductionRes = await query(`SELECT * FROM deduction WHERE "labourId" = $1 ORDER BY point_date DESC`, [id]);

    res.json({ 
      success: true, 
      data: {
        labour,
        attendance: attendanceRes.rows,
        payments: paymentRes.rows,
        deductions: deductionRes.rows
      }
    });

  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/labour/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year, days } = req.body;
    
    // Upsert attendance
    const result = await query(`
      INSERT INTO attendance ("labourId", month, year, days)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("labourId", month, year) 
      DO UPDATE SET days = EXCLUDED.days
      RETURNING *;
    `, [id, month, year, days]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/labour/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, mode, notes } = req.body;
    const result = await query(`
      INSERT INTO payment ("labourId", point_date, amount, mode, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `, [id, date, amount, mode, notes]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/labour/:id/deduction', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, reason } = req.body;
    const result = await query(`
      INSERT INTO deduction ("labourId", point_date, amount, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [id, date, amount, reason]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/settlement', async (req, res) => {
  try {
    const monthStr = req.query.month as string; // 'YYYY-MM'
    if (!monthStr) return res.status(400).json({ success: false, error: 'Month is required' });
    
    const year = parseInt(monthStr.split('-')[0]);
    const month = monthStr.split('-')[1];
    const currentMonthDateStr = `${year}-${month}-01`;

    const laboursRes = await query(`
      SELECT l.*, s.name as "siteName" 
      FROM labour l
      LEFT JOIN site s ON l."siteId" = s.id
      WHERE l.is_archived = false
      ORDER BY l.id DESC
    `);
    const labours = laboursRes.rows;

    const attendanceRes = await query(`SELECT * FROM attendance`);
    const paymentRes = await query(`SELECT * FROM payment`);
    const deductionRes = await query(`SELECT * FROM deduction`);

    const settlementData = labours.map(labour => {
      // Current month
      const currentAttendance = attendanceRes.rows.find(a => a.labourId === labour.id && a.year === year && a.month === month);
      const currentDays = currentAttendance ? Number(currentAttendance.days) : 0;
      
      const currentPayments = paymentRes.rows.filter(p => p.labourId === labour.id && String(p.point_date).startsWith(monthStr));
      const currentDeductions = deductionRes.rows.filter(d => d.labourId === labour.id && String(d.point_date).startsWith(monthStr));

      const paymentsMade = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      let ration = 0, pocketMoney = 0, otherDeductions = 0;
      currentDeductions.forEach(d => {
        const reason = (d.reason || '').toLowerCase();
        if (reason.includes('ration')) ration += Number(d.amount);
        else if (reason.includes('pocket')) pocketMoney += Number(d.amount);
        else otherDeductions += Number(d.amount);
      });

      // Previous due
      const prevAttendance = attendanceRes.rows.filter(a => {
        const aDate = `${a.year}-${String(a.month).padStart(2, '0')}-01`;
        return aDate < currentMonthDateStr;
      });
      const prevPayments = paymentRes.rows.filter(p => String(p.point_date) < currentMonthDateStr);
      const prevDeductions = deductionRes.rows.filter(d => String(d.point_date) < currentMonthDateStr);

      const prevGross = prevAttendance.reduce((sum, a) => sum + (Number(a.days) * Number(labour.dailyRate)), 0);
      const prevPaid = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const prevDeducted = prevDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

      const previousDue = prevGross - prevPaid - prevDeducted;

      return {
        id: labour.id,
        name: labour.name,
        displayId: labour.idNumber || 'NO ID',
        site: labour.siteName || 'Unassigned',
        dailyRate: Number(labour.dailyRate),
        previousDue,
        presentDays: currentDays,
        ration,
        pocketMoney,
        otherDeductions,
        paymentsMade
      };
    });

    res.json({ success: true, data: settlementData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settlement/save', async (req, res) => {
  try {
    const { month: monthStr, workers } = req.body;
    const year = parseInt(monthStr.split('-')[0]);
    const month = monthStr.split('-')[1];
    const point_date = `${year}-${month}-28`; // Standardize

    for (const w of workers) {
      if (w.presentDays > 0 || String(w.presentDays) === "0") {
        await query(`
          INSERT INTO attendance ("labourId", month, year, days)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("labourId", month, year) 
          DO UPDATE SET days = EXCLUDED.days
        `, [w.id, month, year, w.presentDays]);
      }

      // To handle deductions and payments, ideally we'd delete previous entries for this exact point_date / type and insert new ones to allow editing safely.
      // But standardizing bulk update for simplistic usage:

      // Clean existing ones generated by settlement bulk for this month
      await query(`DELETE FROM deduction WHERE "labourId" = $1 AND String(point_date) LIKE $2`, [w.id, `${monthStr}%`]);
      if (w.ration > 0) await query(`INSERT INTO deduction ("labourId", point_date, amount, reason) VALUES ($1, $2, $3, 'Ration')`, [w.id, point_date, w.ration]);
      if (w.pocketMoney > 0) await query(`INSERT INTO deduction ("labourId", point_date, amount, reason) VALUES ($1, $2, $3, 'Pocket Money')`, [w.id, point_date, w.pocketMoney]);
      if (w.otherDeductions > 0) await query(`INSERT INTO deduction ("labourId", point_date, amount, reason) VALUES ($1, $2, $3, 'Other')`, [w.id, point_date, w.otherDeductions]);

      await query(`DELETE FROM payment WHERE "labourId" = $1 AND String(point_date) LIKE $2 AND notes = 'Bulk Settlement'`, [w.id, `${monthStr}%`]);
      if (w.paymentsMade > 0) {
        await query(`INSERT INTO payment ("labourId", point_date, amount, mode, notes) VALUES ($1, $2, $3, 'Cash', 'Bulk Settlement')`, [w.id, point_date, w.paymentsMade]);
      }
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const monthStr = req.query.month as string; // 'YYYY-MM'
    if (!monthStr) return res.status(400).json({ success: false, error: 'Month is required' });
    
    const year = parseInt(monthStr.split('-')[0]);
    const month = monthStr.split('-')[1];

    // Get basic stats
    const laboursRes = await query(`SELECT COUNT(*) as "totalLabours" FROM labour WHERE is_archived = false`);
    const totalLabours = parseInt(laboursRes.rows[0].totalLabours);

    const activeLaboursRes = await query(`
      SELECT COUNT(DISTINCT "labourId") as "activeLabours" 
      FROM attendance 
      WHERE month = $1 AND year = $2 AND days > 0
    `, [month, year]);
    const activeLabours = parseInt(activeLaboursRes.rows[0].activeLabours);

    const paymentsRes = await query(`
      SELECT SUM(amount) as "totalPayments" 
      FROM payment 
      WHERE String(point_date) LIKE $1
    `, [`${monthStr}%`]);
    const totalPayments = parseInt(paymentsRes.rows[0].totalPayments || 0);

    const deductionsRes = await query(`
      SELECT SUM(amount) as "totalDeductions" 
      FROM deduction 
      WHERE String(point_date) LIKE $1
    `, [`${monthStr}%`]);
    const totalDeductions = parseInt(deductionsRes.rows[0].totalDeductions || 0);

    // Site wise summary
    const siteSummariesRes = await query(`
      SELECT 
        s.id, 
        s.name,
        COUNT(l.id) as "labourCount"
      FROM site s
      LEFT JOIN labour l ON l."siteId" = s.id AND l.is_archived = false
      GROUP BY s.id, s.name
    `);
    const siteSummaries = siteSummariesRes.rows;

    res.json({ 
      success: true, 
      data: {
        totalLabours,
        activeLabours,
        totalPayments,
        totalDeductions,
        siteSummaries
      } 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/labour/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM labour WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const apiRouter = router;
