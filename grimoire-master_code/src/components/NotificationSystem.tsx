import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationContextProps {
  notifications: NotificationItem[];
  showNotification: (message: string, type?: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

// Define global list of listeners for custom event trigger (can be called outside standard React trees)
type NotificationListener = (message: string, type: NotificationType, duration?: number) => void;
const listeners = new Set<NotificationListener>();

/**
 * Global notify helper.
 * Can be imported anywhere in the project to dispatch notifications:
 * @example notify.success("Eroe eliminato con successo!")
 */
export const notify = {
  show: (message: string, type: NotificationType = 'info', duration?: number) => {
    listeners.forEach((listener) => listener(message, type, duration));
  },
  success: (message: string, duration?: number) => notify.show(message, 'success', duration),
  error: (message: string, duration?: number) => notify.show(message, 'error', duration),
  info: (message: string, duration?: number) => notify.show(message, 'info', duration),
  warning: (message: string, duration?: number) => notify.show(message, 'warning', duration),
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'info', duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setNotifications((prev) => [...prev, { id, message, type, duration }]);

      setTimeout(() => {
        removeNotification(id);
      }, duration);
    },
    [removeNotification]
  );

  // Bind the global notify object to the React state provider
  useEffect(() => {
    const handleGlobalNotify: NotificationListener = (message, type, duration) => {
      showNotification(message, type, duration);
    };
    listeners.add(handleGlobalNotify);
    return () => {
      listeners.delete(handleGlobalNotify);
    };
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

// Single custom gorgeous notification card styled for the rpg/mystic look
export function NotificationCard({
  notif,
  onClose,
}: {
  notif: NotificationItem;
  onClose: () => void;
  key?: React.Key | string;
}) {
  const getStyles = () => {
    switch (notif.type) {
      case 'success':
        return {
          borderClass: 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]',
          glowBg: 'bg-green-950/40 backdrop-blur-md',
          textClass: 'text-green-400',
          icon: <CheckCircle className="w-4 h-4 text-green-400" />,
        };
      case 'error':
        return {
          borderClass: 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
          glowBg: 'bg-red-950/40 backdrop-blur-md',
          textClass: 'text-red-400',
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
        };
      case 'warning':
        return {
          borderClass: 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)]',
          glowBg: 'bg-yellow-950/40 backdrop-blur-md',
          textClass: 'text-yellow-400',
          icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
        };
      case 'info':
      default:
        return {
          borderClass: 'border-primary/50 shadow-[0_0_15px_rgba(242,202,80,0.15)]',
          glowBg: 'bg-surface-container-high/90 backdrop-blur-md',
          textClass: 'text-primary',
          icon: <Info className="w-4 h-4 text-primary" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 max-w-xs md:max-w-sm w-80 font-mono text-xs ${styles.borderClass} ${styles.glowBg} pointer-events-auto`}
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <div className="flex-1 text-on-surface leading-snug">{notif.message}</div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
