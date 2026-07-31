import { Suspense, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Bell, ClipboardList, Download, History, Home, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RouteSkeleton from '../RouteSkeleton';

const employeeNavLinkClass = ({ isActive }) => `relative flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-[13px] font-bold no-underline transition-colors duration-200 before:absolute before:top-1 before:h-[3px] before:w-6 before:rounded-full before:bg-transparent before:content-[''] hover:bg-operation-soft hover:text-operation-mint-dark max-[720px]:min-h-[58px] max-[720px]:flex-col max-[720px]:gap-1 max-[720px]:text-[11px] max-[720px]:before:top-1 ${isActive ? 'bg-operation-soft text-operation-mint-dark max-[720px]:before:bg-operation-mint' : 'text-operation-muted'}`;

export default function EmployeeLayout() {
  const { user } = useAuth();
  const androidDownloadUrl = import.meta.env.VITE_ANDROID_DOWNLOAD_URL || '/Ritmika.apk';
  const showAndroidDownload = Boolean(androidDownloadUrl) && !Capacitor.isNativePlatform();

  useEffect(() => {
    const preload = () => Promise.allSettled([
      import('../../pages/employee/EmployeeHome'),
      import('../../pages/employee/EmployeeActivities'),
      import('../../pages/employee/EmployeeHistory'),
      import('../../pages/employee/EmployeeNotifications'),
      import('../../pages/employee/EmployeeProfile'),
      import('../ChecklistExecutionWorkspace'),
    ]);
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timerId = window.setTimeout(preload, 120);
    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_0%,#ddf4ee_0,transparent_28rem),#f4f8f8] text-operation-ink">
      <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-[rgba(197,218,219,0.9)] bg-white/88 px-[clamp(18px,4vw,56px)] py-3 backdrop-blur-[18px] max-[720px]:min-h-16 max-[720px]:px-4 max-[720px]:py-2">
        <a className="inline-flex items-center gap-2.5 text-xl font-extrabold text-operation-ink no-underline" href="/app" aria-label="Início do aplicativo Ritmika">
          <img
            src="/ritmika-mark-square-final.png"
            alt="Ritmika"
            className="size-[38px] rounded-[13px] object-cover shadow-[0_8px_22px_rgba(15,141,124,0.22)]"
            fetchPriority="high"
          />
          <span>Ritmika</span>
        </a>

        <div className="flex items-center gap-2 max-[720px]:gap-1">
          {showAndroidDownload ? (
            <a
              className="inline-flex items-center gap-2 rounded-full border border-[#cce9e3] bg-[#effaf7] px-3.5 py-2 text-[12px] font-extrabold text-[#087468] no-underline shadow-[0_5px_14px_rgba(15,143,126,0.08)] transition duration-200 hover:-translate-y-px hover:border-[#9dd9ce] hover:bg-[#e5f7f2] focus-visible:outline-3 focus-visible:outline-[rgba(15,143,126,0.24)] focus-visible:outline-offset-3 max-[720px]:size-10 max-[720px]:justify-center max-[720px]:rounded-full max-[720px]:p-0"
              href={androidDownloadUrl}
              download
              aria-label="Baixar app Android"
              title="Baixar app Android"
            >
              <Download size={16} aria-hidden="true" />
              <span className="max-[720px]:sr-only">Baixar app</span>
            </a>
          ) : null}
          <NavLink className="inline-flex min-w-0 items-center gap-2.5 rounded-full border border-[rgba(24,63,68,0.12)] bg-white/86 px-3 py-1.5 text-[#183f44] no-underline transition duration-200 hover:-translate-y-px hover:border-[rgba(15,143,126,0.34)] hover:bg-white focus-visible:outline-3 focus-visible:outline-[rgba(15,143,126,0.24)] focus-visible:outline-offset-3 max-[720px]:border-transparent max-[720px]:bg-transparent max-[720px]:p-1" to="/app/profile" aria-label="Abrir meu perfil">
            <span className="grid min-w-0 text-right max-[720px]:sr-only">
              <strong className="max-w-40 truncate text-[13px]">{user?.name || 'Minha rotina'}</strong>
              <small className="truncate text-[11px] text-[#718389]">Meu perfil</small>
            </span>
            <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#143f43,#0f8f7e)] text-sm font-black text-white shadow-[0_7px_18px_rgba(20,63,67,0.18)] max-[720px]:size-[42px]" aria-hidden="true">
              {String(user?.name || 'R').trim().charAt(0).toUpperCase()}
            </span>
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-[min(1120px,calc(100%_-_36px))] pb-[116px] pt-[26px] max-[720px]:w-[min(calc(100%_-_28px),560px)] max-[720px]:pb-[calc(104px_+_env(safe-area-inset-bottom,0px))] max-[720px]:pt-5">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#cce9e3] bg-operation-soft px-2.5 py-2 text-xs font-bold text-operation-mint-dark max-[720px]:mb-[18px]">
          <Sparkles size={15} aria-hidden="true" />
          Suas atividades e rotinas
        </div>
        <Suspense fallback={<RouteSkeleton variant="operation" label="Carregando sua área de operação" />}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="fixed bottom-[18px] left-1/2 z-30 grid w-[min(520px,calc(100%_-_28px))] -translate-x-1/2 grid-cols-4 rounded-[22px] border border-[rgba(199,220,220,0.95)] bg-white/94 p-1.5 shadow-[0_18px_55px_rgba(23,49,58,0.16)] backdrop-blur-[18px] max-[720px]:right-0 max-[720px]:bottom-0 max-[720px]:left-0 max-[720px]:w-full max-[720px]:translate-x-0 max-[720px]:rounded-[22px_22px_0_0] max-[720px]:border-x-0 max-[720px]:border-b-0 max-[720px]:bg-white/97 max-[720px]:px-2.5 max-[720px]:pb-[max(8px,env(safe-area-inset-bottom,0px))] max-[720px]:pt-2" aria-label="Navegação principal do App de Operação">
        <NavLink className={employeeNavLinkClass} to="/app" end><Home aria-hidden="true" className="size-[18px] max-[720px]:size-[21px]" /><span>Início</span></NavLink>
        <NavLink className={employeeNavLinkClass} to="/app/activities"><ClipboardList aria-hidden="true" className="size-[18px] max-[720px]:size-[21px]" /><span>Atividades</span></NavLink>
        <NavLink className={employeeNavLinkClass} to="/app/history"><History aria-hidden="true" className="size-[18px] max-[720px]:size-[21px]" /><span>Histórico</span></NavLink>
        <NavLink className={employeeNavLinkClass} to="/app/notifications"><Bell aria-hidden="true" className="size-[18px] max-[720px]:size-[21px]" /><span>Avisos</span></NavLink>
      </nav>
    </div>
  );
}
