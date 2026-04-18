import Bill from "../models/Bill.model.js";
import Payment from "../models/Payment.model.js";
import Expense from "../models/Expense.model.js";
import Tenant from "../models/Tenant.model.js";
import { getScopedLandlordId } from "../utils/access.js";
import { ensureReportMonthAccess } from "../utils/plans.js";

export const monthly = async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month)
      return res
        .status(400)
        .json({ success: false, message: "মাস দিন (যেমন: 2025-01)" });

    const landlordId = getScopedLandlordId(req);
    if (!landlordId)
      return res
        .status(400)
        .json({ success: false, message: "বাড়ীওয়ালা নির্বাচন করুন" });

    const reportAccess = await ensureReportMonthAccess(landlordId, month);
    if (!reportAccess.allowed)
      return res.status(403).json({ success: false, message: reportAccess.message });

    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const [bills, payments, expenses, activeTenants] = await Promise.all([
      Bill.find({ landlordId, month }),
      Payment.find({
        landlordId,
        status: "success",
        createdAt: {
          $gte: start,
          $lt: end,
        },
      }),
      Expense.find({ landlordId, month }),
      Tenant.countDocuments({ landlordId, isActive: true }),
    ]);

    const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalCollected = bills.reduce((s, b) => s + b.paidAmount, 0);
    const totalDue = bills.reduce((s, b) => s + b.dueAmount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const profit = totalCollected - totalExpenses;

    const statusBreakdown = {
      paid: bills.filter((b) => b.status === "paid").length,
      partial: bills.filter((b) => b.status === "partial").length,
      unpaid: bills.filter((b) => b.status === "unpaid").length,
    };

    res.json({
      success: true,
      data: {
        month,
        activeTenants,
        totalBilled,
        totalCollected,
        totalDue,
        totalExpenses,
        profit,
        statusBreakdown,
        bills,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const yearly = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const landlordId = getScopedLandlordId(req);
    if (!landlordId)
      return res
        .status(400)
        .json({ success: false, message: "বাড়ীওয়ালা নির্বাচন করুন" });

    const months = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, "0");
      return `${year}-${m}`;
    });
    const allowedMonths = [];
    for (const month of months) {
      const access = await ensureReportMonthAccess(landlordId, month);
      if (access.allowed) allowedMonths.push(month);
    }

    const results = await Promise.all(
      allowedMonths.map(async (month) => {
        const bills = await Bill.find({ landlordId, month });
        const expenses = await Expense.find({ landlordId, month });
        const collected = bills.reduce((s, b) => s + b.paidAmount, 0);
        const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
        return {
          month,
          collected,
          expenses: expTotal,
          profit: collected - expTotal,
        };
      }),
    );

    const totalCollected = results.reduce((s, r) => s + r.collected, 0);
    const totalExpenses = results.reduce((s, r) => s + r.expenses, 0);

    res.json({
      success: true,
      data: {
        year,
        monthlyBreakdown: results,
        totalCollected,
        totalExpenses,
        totalProfit: totalCollected - totalExpenses,
      },
    });
  } catch (err) {
    next(err);
  }
};
