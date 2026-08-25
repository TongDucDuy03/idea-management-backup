import { GlobalStyles as MuiGlobalStyles } from '@mui/material';
import React from 'react';
import { COLORS } from './theme';

const GlobalStyles: React.FC = () => (
  <MuiGlobalStyles
    styles={{
      /* ==========================================
         KEYFRAME ANIMATIONS 
         ========================================== */
      '@keyframes fadeInUp': {
        from: {
          opacity: 0,
          transform: 'translateY(20px)',
        },
        to: {
          opacity: 1,
          transform: 'translateY(0)',
        },
      },

      '@keyframes fadeIn': {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },

      '@keyframes slideInLeft': {
        from: {
          opacity: 0,
          transform: 'translateX(-20px)',
        },
        to: {
          opacity: 1,
          transform: 'translateX(0)',
        },
      },

      '@keyframes slideInRight': {
        from: {
          opacity: 0,
          transform: 'translateX(20px)',
        },
        to: {
          opacity: 1,
          transform: 'translateX(0)',
        },
      },

      '@keyframes scaleIn': {
        from: {
          opacity: 0,
          transform: 'scale(0.95)',
        },
        to: {
          opacity: 1,
          transform: 'scale(1)',
        },
      },

      '@keyframes pulse': {
        '0%, 100%': {
          opacity: 1,
        },
        '50%': {
          opacity: 0.6,
        },
      },

      '@keyframes shimmer': {
        '0%': {
          backgroundPosition: '-200% 0',
        },
        '100%': {
          backgroundPosition: '200% 0',
        },
      },

      '@keyframes float': {
        '0%, 100%': {
          transform: 'translateY(0px)',
        },
        '50%': {
          transform: 'translateY(-8px)',
        },
      },

      '@keyframes gradientShift': {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' },
      },

      '@keyframes countUp': {
        from: {
          opacity: 0,
          transform: 'translateY(10px)',
        },
        to: {
          opacity: 1,
          transform: 'translateY(0)',
        },
      },

      /* ==========================================
         UTILITY ANIMATION CLASSES 
         ========================================== */
      '.animate-fadeInUp': {
        animation: 'fadeInUp 0.5s ease-out forwards',
      },
      '.animate-fadeIn': {
        animation: 'fadeIn 0.4s ease-out forwards',
      },
      '.animate-slideInLeft': {
        animation: 'slideInLeft 0.4s ease-out forwards',
      },
      '.animate-slideInRight': {
        animation: 'slideInRight 0.4s ease-out forwards',
      },
      '.animate-scaleIn': {
        animation: 'scaleIn 0.3s ease-out forwards',
      },
      '.animate-float': {
        animation: 'float 3s ease-in-out infinite',
      },

      /* Staggered animation delays */
      '.delay-100': { animationDelay: '100ms' },
      '.delay-200': { animationDelay: '200ms' },
      '.delay-300': { animationDelay: '300ms' },
      '.delay-400': { animationDelay: '400ms' },
      '.delay-500': { animationDelay: '500ms' },

      /* ==========================================
         GLASSMORPHISM UTILITIES 
         ========================================== */
      '.glass': {
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
      },
      '.glass-dark': {
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },

      /* ==========================================
         GRADIENT BACKGROUNDS 
         ========================================== */
      '.gradient-primary': {
        background: `linear-gradient(135deg, ${COLORS.blue[500]} 0%, ${COLORS.blue[700]} 100%)`,
      },
      '.gradient-hero': {
        background: `linear-gradient(135deg, ${COLORS.navy.main} 0%, ${COLORS.slate[800]} 50%, ${COLORS.blue[900]} 100%)`,
        backgroundSize: '200% 200%',
        animation: 'gradientShift 8s ease infinite',
      },
      '.gradient-card': {
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      },

      /* ==========================================
         SKELETON LOADING 
         ========================================== */
      '.skeleton': {
        background: `linear-gradient(90deg, ${COLORS.slate[100]} 25%, ${COLORS.slate[200]} 50%, ${COLORS.slate[100]} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: 8,
      },

      /* ==========================================
         SMOOTH PAGE TRANSITIONS 
         ========================================== */
      '.page-enter': {
        opacity: 0,
        transform: 'translateY(12px)',
      },
      '.page-enter-active': {
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },

      /* ==========================================
         GLOBAL BODY OVERRIDES 
         ========================================== */
      'html, body': {
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        overflowX: 'hidden',
      },
      '#root': {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      },

      /* ==========================================
         SMOOTH SCROLLING 
         ========================================== */
      'html': {
        scrollBehavior: 'smooth',
      },
    }}
  />
);

export default GlobalStyles;
