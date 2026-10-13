import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useTauriIpc } from '../../hooks/useTauriIpc';
import type { DeviceCodeResponse, UserAccount } from '../../types/launcher';

interface MicrosoftDeviceCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: UserAccount) => void;
}

export const MicrosoftDeviceCodeModal: React.FC<MicrosoftDeviceCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { startMicrosoftLogin, pollMicrosoftLogin, openExternalUrl } = useTauriIpc();

  const [step, setStep] = useState<'idle' | 'requesting' | 'waiting' | 'success' | 'error'>('idle');
  const [deviceData, setDeviceData] = useState<DeviceCodeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [successAccount, setSuccessAccount] = useState<UserAccount | null>(null);

  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      isCancelledRef.current = true;
      setStep('idle');
      setDeviceData(null);
      setErrorMessage(null);
      setCopied(false);
      setSuccessAccount(null);
      return;
    }

    isCancelledRef.current = false;
    let isCurrent = true;

    async function startAuth() {
      setStep('requesting');
      setErrorMessage(null);

      const codeResp = await startMicrosoftLogin();
      if (!isCurrent || isCancelledRef.current) return;

      if (!codeResp) {
        setStep('error');
        setErrorMessage('No se pudo conectar con el servicio de autenticación de Microsoft.');
        return;
      }

      setDeviceData(codeResp);
      setStep('waiting');

      // Poll until user authorizes or closes
      const account = await pollMicrosoftLogin(codeResp.device_code);
      if (!isCurrent || isCancelledRef.current) return;

      if (account) {
        setSuccessAccount(account);
        setStep('success');
        setTimeout(() => {
          if (!isCancelledRef.current) {
            onSuccess(account);
            onClose();
          }
        }, 1500);
      } else {
        setStep('error');
        setErrorMessage('La autorización falló o fue cancelada por el usuario.');
      }
    }

    startAuth();

    return () => {
      isCurrent = false;
      isCancelledRef.current = true;
    };
  }, [isOpen, startMicrosoftLogin, pollMicrosoftLogin, onSuccess, onClose]);

  const handleCopyCode = async () => {
    if (!deviceData) return;
    try {
      await navigator.clipboard.writeText(deviceData.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Error al copiar código:', e);
    }
  };

  const handleOpenBrowser = async () => {
    if (!deviceData) return;
    await handleCopyCode();
    await openExternalUrl(deviceData.verification_uri);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Inicio de Sesión Microsoft</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {step === 'requesting' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-sm font-medium text-slate-300">
                Contactando con Microsoft Identity Platform...
              </p>
            </div>
          )}

          {step === 'waiting' && deviceData && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Para vincular tu cuenta oficial de Minecraft, sigue estos dos pasos:
              </p>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Código de Autorización
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar código</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center py-2 bg-slate-900 border border-slate-700/60 rounded-lg">
                  <span className="text-2xl font-mono font-black text-emerald-400 tracking-widest select-all">
                    {deviceData.user_code}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleOpenBrowser}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Copiar y Abrir en Navegador</span>
                </button>
                <p className="text-[11px] text-center text-slate-400">
                  Enlace oficial:{' '}
                  <span className="font-mono text-slate-300">{deviceData.verification_uri}</span>
                </p>
              </div>

              {/* Polling Spinner Indicator */}
              <div className="flex items-center justify-center gap-2.5 pt-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Esperando que completes el inicio de sesión en tu navegador...</span>
              </div>
            </div>
          )}

          {step === 'success' && successAccount && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              <h3 className="text-base font-bold text-white">¡Sesión Iniciada con Éxito!</h3>
              <p className="text-xs text-slate-300">
                Bienvenido de vuelta,{' '}
                <span className="font-semibold text-emerald-400">{successAccount.username}</span>.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <h3 className="text-sm font-bold text-white">No se pudo iniciar sesión</h3>
              <p className="text-xs text-slate-400 px-4 leading-relaxed">
                {errorMessage ?? 'Ocurrió un error inesperado al validar la cuenta.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  isCancelledRef.current = false;
                  setStep('requesting');
                }}
                className="mt-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800/80 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {step === 'success' ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
};
