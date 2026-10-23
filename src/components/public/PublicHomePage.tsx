import React from 'react';
import {
  Briefcase,
  ShieldCheck,
  FileText,
  Users,
  Award,
  Lock,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  ArrowRight,
  Calculator,
  Building2,
  Receipt
} from 'lucide-react';
import { DEVELOPER_CREDIT } from '../../services/native/whatsappShare';

interface PublicHomePageProps {
  onGoToLogin: () => void;
  officeName: string;
  ntn: string;
  address: string;
  email: string;
  phone: string;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  onGoToLogin,
  officeName,
  ntn,
  address,
  email,
  phone
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md font-bold shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-white tracking-tight line-clamp-1">
              {officeName}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>NTN: {ntn}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{address}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToLogin}
          className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md transition cursor-pointer min-h-[40px]"
        >
          <Lock className="w-4 h-4" />
          <span>Staff Login</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-20 px-4 sm:px-8 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>FBR Licensed Tax & Corporate Advisory Specialists</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Comprehensive Tax Filing, NTN & Corporate Services in <span className="text-emerald-400">Balochistan & Pakistan</span>
          </h2>

          <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Ahmed Doda Tax & Corporate Advisory Services provides end-to-end tax compliance, individual and business Income Tax Returns, NTN registration, sales tax e-filing, and FBR dispute representation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={onGoToLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg transition cursor-pointer min-h-[48px]"
            >
              <span>Access Secure Tax Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={`tel:${phone}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition min-h-[48px]"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Contact Office Hotline</span>
            </a>
          </div>
        </section>

        {/* Practice Areas / Key Services */}
        <section className="py-10 px-4 sm:px-8 bg-slate-900/60 border-y border-slate-800/80">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-lg sm:text-2xl font-bold text-white">Our Core Professional Practice Areas</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Authorized Advisory for Salaried Individuals, Sole Proprietors, AOPs & Private Limited Companies</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Income Tax Return Filing</h4>
                <p className="text-xs text-slate-400">
                  Annual income tax return preparation, wealth reconciliation, and CPR tax deposit challan verification for salaried & business filers.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">NTN Registration & Mod</h4>
                <p className="text-xs text-slate-400">
                  New National Tax Number (NTN) registration for individuals and businesses, address modification, and principal activity changes.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Sales Tax & PRA/BRA</h4>
                <p className="text-xs text-slate-400">
                  Sales tax registration, monthly sales & purchase invoice Annexure filing, and provincial revenue authority compliance.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Notice Audit & Advisory</h4>
                <p className="text-xs text-slate-400">
                  Professional drafting of replies to FBR audit notices, Section 111 inquiry representation, and penalty waiver appeals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Office Contact Info */}
        <section className="py-10 px-4 sm:px-8 max-w-5xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Office Location</span>
                <span className="text-xs sm:text-sm font-semibold text-white block mt-0.5">{address}</span>
                <span className="text-[11px] text-slate-400">Hub / Lasbela / Balochistan</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Office Phone / WhatsApp</span>
                <span className="text-xs sm:text-sm font-semibold text-white font-mono block mt-0.5">{phone}</span>
                <span className="text-[11px] text-emerald-400 font-mono">NTN: {ntn}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Official Email</span>
                <span className="text-xs sm:text-sm font-semibold text-emerald-300 font-mono block mt-0.5">{email}</span>
                <span className="text-[11px] text-slate-400">Tax Advisory Support</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer with Developer Credit */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 px-4 text-center text-xs text-slate-400 space-y-2">
        <div className="font-semibold text-slate-300">
          {officeName} • NTN: {ntn} • {address}
        </div>
        <div className="text-[11px] text-emerald-400 font-medium">
          {DEVELOPER_CREDIT}
        </div>
        <div className="text-[10px] text-slate-400">
          © {new Date().getFullYear()} Ahmed Doda Tax & Corporate Advisory Services. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};
