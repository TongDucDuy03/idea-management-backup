import { createTheme, alpha } from '@mui/material/styles';

// ==========================================
// VICO Enterprise Design System
// ==========================================

const COLORS = {
  // Primary palette
  navy: {
    50: '#f0f4ff',
    100: '#dbe4ff',
    200: '#bac8ff',
    300: '#91a7ff',
    400: '#748ffc',
    500: '#5c7cfa',
    600: '#4c6ef5',
    700: '#4263eb',
    800: '#3b5bdb',
    900: '#364fc7',
    main: '#0F172A',
  },
  // Accent
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3B82F6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  // Semantic
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    400: '#34d399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    400: '#fbbf24',
    500: '#F59E0B',
    600: '#d97706',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    400: '#f87171',
    500: '#EF4444',
    600: '#dc2626',
  },
  // Neutrals
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: COLORS.blue[500],
      light: COLORS.blue[400],
      dark: COLORS.blue[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: COLORS.navy.main,
      light: COLORS.slate[700],
      dark: COLORS.slate[900],
      contrastText: '#ffffff',
    },
    success: {
      main: COLORS.emerald[500],
      light: COLORS.emerald[400],
      dark: COLORS.emerald[700],
    },
    warning: {
      main: COLORS.amber[500],
      light: COLORS.amber[400],
      dark: COLORS.amber[600],
    },
    error: {
      main: COLORS.red[500],
      light: COLORS.red[400],
      dark: COLORS.red[600],
    },
    background: {
      default: COLORS.slate[50],
      paper: '#ffffff',
    },
    text: {
      primary: COLORS.slate[900],
      secondary: COLORS.slate[500],
    },
    divider: COLORS.slate[200],
  },

  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.1rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
      color: COLORS.slate[600],
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: COLORS.slate[500],
    },
    body1: {
      fontSize: '0.938rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: COLORS.slate[400],
    },
    button: {
      fontWeight: 600,
      textTransform: 'none' as const,
      letterSpacing: '0.01em',
    },
  },

  shape: {
    borderRadius: 12,
  },

  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    // Rest filled with a standard shadow
    ...Array(18).fill('0 25px 50px -12px rgba(0, 0, 0, 0.25)'),
  ] as any,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${COLORS.slate[300]} transparent`,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: COLORS.slate[300],
            borderRadius: 4,
            '&:hover': {
              background: COLORS.slate[400],
            },
          },
          '::selection': {
            background: alpha(COLORS.blue[500], 0.2),
            color: COLORS.blue[900],
          },
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        contained: {
          boxShadow: `0 1px 3px 0 ${alpha(COLORS.blue[500], 0.3)}, 0 1px 2px -1px ${alpha(COLORS.blue[500], 0.3)}`,
          '&:hover': {
            boxShadow: `0 4px 14px 0 ${alpha(COLORS.blue[500], 0.4)}`,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: alpha(COLORS.blue[500], 0.04),
          },
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '1rem',
          borderRadius: 12,
        },
        sizeSmall: {
          padding: '6px 14px',
          fontSize: '0.8125rem',
          borderRadius: 8,
        },
      },
    },

    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${COLORS.slate[200]}`,
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        },
      },
    },

    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${COLORS.slate[200]}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: COLORS.slate[300],
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.2s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: COLORS.blue[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: '2px',
              borderColor: COLORS.blue[500],
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: COLORS.blue[600],
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.8125rem',
        },
        filled: {
          '&.MuiChip-colorSuccess': {
            backgroundColor: COLORS.emerald[50],
            color: COLORS.emerald[700],
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: COLORS.amber[50],
            color: COLORS.amber[600],
          },
          '&.MuiChip-colorError': {
            backgroundColor: COLORS.red[50],
            color: COLORS.red[600],
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.938rem',
          minHeight: 48,
          padding: '12px 24px',
          borderRadius: '10px 10px 0 0',
          transition: 'all 0.2s ease',
          '&.Mui-selected': {
            color: COLORS.blue[600],
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          backgroundColor: COLORS.blue[500],
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
        },
        standardSuccess: {
          backgroundColor: COLORS.emerald[50],
          color: COLORS.emerald[700],
          '& .MuiAlert-icon': {
            color: COLORS.emerald[500],
          },
        },
        standardError: {
          backgroundColor: COLORS.red[50],
          color: COLORS.red[600],
          '& .MuiAlert-icon': {
            color: COLORS.red[500],
          },
        },
        standardWarning: {
          backgroundColor: COLORS.amber[50],
          color: COLORS.amber[600],
          '& .MuiAlert-icon': {
            color: COLORS.amber[500],
          },
        },
        standardInfo: {
          backgroundColor: COLORS.blue[50],
          color: COLORS.blue[700],
          '& .MuiAlert-icon': {
            color: COLORS.blue[500],
          },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.slate[800],
          borderRadius: 8,
          fontSize: '0.8125rem',
          fontWeight: 500,
          padding: '8px 14px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
        },
        arrow: {
          color: COLORS.slate[800],
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: COLORS.slate[200],
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
        },
      },
    },
  },
});

export { COLORS };
export default theme;
