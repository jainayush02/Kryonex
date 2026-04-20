import * as React from 'react';
declare global {
  interface Window {
    google: any;
  }
}
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { LogIn, UserPlus, Github, RefreshCw, Eye, EyeOff, X, ArrowRight, ShieldCheck, Activity, Cpu, Database, Network, MonitorSmartphone, Terminal } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import logo from '../logo.png';
import { toast } from 'sonner';
import { GeometricAIGraphics } from '@/src/components/GeometricAIGraphics';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [showOtpInput, setShowOtpInput] = React.useState(false);
  const [isForgotPassword, setIsForgotPassword] = React.useState(false);
  const [isVerifyingReset, setIsVerifyingReset] = React.useState(false);
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [name, setName] = React.useState('');
  const [resendTimer, setResendTimer] = React.useState(0);
  const [canResend, setCanResend] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showLoginForm, setShowLoginForm] = React.useState(false);
  const [isCheckingSession, setIsCheckingSession] = React.useState(true);
  const navigate = useNavigate();

  const ADMIN_EMAIL = 'ayushsancheti098@gmail.com';
  const lastEvent = React.useRef<string | null>(null);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  React.useEffect(() => {
    if (showOtpInput || isVerifyingReset) {
      setResendTimer(60);
      setCanResend(false);
      setOtp(''); // Clear OTP when switching to verification views
    }
  }, [showOtpInput, isVerifyingReset]);

  React.useEffect(() => {
    const isUserAdmin = (userEmail?: string) =>
      userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Check for existing session and redirect
    const checkSession = async () => {
      // Skip if we just signed out to prevent race conditions
      if (lastEvent.current === 'SIGNED_OUT') {
        setIsCheckingSession(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(isUserAdmin(session.user.email) ? '/admin' : '/portal');
      } else {
        setIsCheckingSession(false);
      }
    };
    checkSession();

    // Detect auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      lastEvent.current = event;

      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
        setIsCheckingSession(false);
      } else if (event === 'SIGNED_IN' && session) {
        navigate(isUserAdmin(session.user.email) ? '/admin' : '/portal');
      } else if (event === 'SIGNED_OUT') {
        // Force stay on login page
        setIsResettingPassword(false);
        setIsForgotPassword(false);
        setIsVerifyingReset(false);
        setIsCheckingSession(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        setIsCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);



  const gsiInitialized = React.useRef(false);

  React.useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes("YOUR")) return;

    if (gsiInitialized.current) return;

    console.log('Final Verifier - Client ID:', clientId);
    console.log('Final Verifier - Origin:', window.location.origin);

    const handleCredentialResponse = async (response: any) => {
      try {
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });
        if (error) throw error;
      } catch (error: any) {
        toast.error('Google login failed: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (window.google?.accounts?.id && !gsiInitialized.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          itp_support: true,
          use_fedcm_for_prompt: false,
          cancel_on_tap_outside: true
        });

        gsiInitialized.current = true;

        // Also render a hidden button to have the selection dialog ready
        const googleBtnRoot = document.getElementById('google-signin-btn-hidden');
        if (googleBtnRoot) {
          window.google.accounts.id.renderButton(googleBtnRoot, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left'
          });
        }
      }
    };

    // Check if script is already loaded
    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      // Wait for script to load (async defer in index.html)
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initializeGoogle();
          clearInterval(checkInterval);
        }
      }, 100);
    }
  }, []);

  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsLoading(true);
    try {
      if (isVerifyingReset) {
        // For recovery, we just call the reset request again
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      } else {
        // For signup
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        });
        if (error) throw error;
      }
      toast.success('Verification code resent!');
      setResendTimer(60);
      setCanResend(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Sends the 6-digit code because {{ .Token }} is in the template
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('Verification code sent to your email.');
      setIsVerifyingReset(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery'
      });
      if (error) throw error;
      setIsVerifyingReset(false);
      setIsResettingPassword(true);
      toast.success('Identity verified!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (showOtpInput) {
          // Verify OTP for Signup
          const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'signup'
          });
          if (error) throw error;
          toast.success('Account verified!');
          navigate('/portal');
        } else {
          // Initial Sign Up
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
          });
          if (error) throw error;
          setShowOtpInput(true);
          toast.success('Code sent to your email.');
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const isUserAdmin = data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        toast.success(`Welcome ${isUserAdmin ? 'Admin' : 'back'}!`);
        navigate(isUserAdmin ? '/admin' : '/portal');
      }
    } catch (error: any) {
      toast.error(error.message || 'Auth failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setIsResettingPassword(false);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId || clientId.includes("YOUR")) {
      toast.error('Google Client ID not configured. Please see .env file.');
      return;
    }

    if (window.google?.accounts?.id) {
      // Trigger the Google selection dialog (One Tap / FedCM)
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
          // If One Tap is blocked, dismissed, or already shown, try to trigger the hidden standard button
          // Programmatically clicking the button is a fallback for when the prompt fails to show
          const btn = document.querySelector('#google-signin-btn-hidden [role="button"]') as HTMLElement;
          if (btn) {
            btn.click();
          } else if (notification.isNotDisplayed()) {
            toast.error('Google Sign-In prompt was blocked. Please check your browser settings or try again.');
          }
        }
      });
    } else {
      toast.error('Google Sign-In is initializing. Please try again.');
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-pearl dark:bg-obsidian flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-slate-200 dark:border-graphite border-t-graphite dark:border-t-white rounded-full animate-spin" />
          <div className="space-y-1">
            <h2 className="text-sm font-anta tracking-widest text-graphite dark:text-white uppercase">Initializing Sync</h2>
            <p className="text-[10px] text-slate-500 font-anta uppercase tracking-tight">Checking Secure Uplink...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-[#fbfbfb] dark:bg-obsidian transition-colors duration-500 relative overflow-x-hidden lg:overflow-hidden font-anta">
      {/* Hidden container for standard Google button to fallback to after One Tap cancellation */}
      <div id="google-signin-btn-hidden" className="hidden"></div>
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Glassmorphism Navbar - Robust 3-Column Grid centering */}
      <nav className="fixed top-0 left-0 right-0 z-50 grid grid-cols-3 items-center px-6 lg:px-12 py-3 lg:py-4 bg-white/50 dark:bg-white/5 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shadow-[0_4px_24px_rgb(0,0,0,0.02)] dark:shadow-none transition-all duration-300">
        <div className="flex items-center justify-start">
          {/* Left spacer - Reserved for mobile menu/back buttons in future */}
        </div>

        <div className="flex items-center justify-center translate-y-[2px] lg:translate-y-0">
          <motion.h1
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="flex flex-col items-center gap-1 font-anta font-bold uppercase leading-tight cursor-pointer"
            onClick={() => navigate('/')}
          >
            <img
              src={logo}
              alt="KRYONEX"
              className="h-[22px] lg:h-[28px] w-auto dark:invert-0 invert object-contain"
            />
          </motion.h1>
        </div>

        <div className="flex items-center justify-end">
          <AnimatePresence>
            {!showLoginForm && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="hidden lg:block"
              >
                <Button
                  onClick={() => setShowLoginForm(true)}
                  variant="ghost"
                  className="bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#1e293b] dark:text-white font-anta tracking-widest uppercase rounded-full px-6 transition-all duration-300 group h-10 lg:h-11 shadow-none border-none"
                >
                  <span className="font-bold text-xs lg:text-sm">Get Started</span>
                  <ArrowRight className="w-4 h-4 ml-2 inline-block group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Left Side: Performance Visuals (Desktop) - Locked Static */}
      <div className="hidden lg:flex flex-[1.4] relative overflow-hidden pointer-events-none h-full">
        <GeometricAIGraphics />
      </div>


      <motion.div
        className="flex-1 flex flex-col items-center lg:items-start justify-start pt-20 lg:pt-[15vh] pb-12 px-6 lg:px-16 relative z-10 h-auto lg:h-full lg:overflow-y-auto custom-scrollbar"
      >





        {/* 1. Rigid Spacer - Immutable 120px block to lock everything below it */}
        <div className="lg:hidden w-full h-[120px] flex-shrink-0 pointer-events-none" aria-hidden="true" />

        {/* 2. Decoupled Phrases - Floating over the spacer, physically incapable of shifting the flow */}
        <div className="lg:hidden w-full absolute top-20 left-0 h-[120px] pointer-events-none z-20 overflow-hidden flex items-start justify-center pt-4">
           <div className="w-full">
              <GeometricAIGraphics showTree={false} />
           </div>
        </div>

        {/* Mobile Primary CTA - Inserted between Narrative and Graphics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="lg:hidden w-full flex justify-center mb-2 px-4"
        >
          <Button
            onClick={() => setShowLoginForm(true)}
            className="w-full max-w-[180px] bg-white/80 dark:bg-obsidian/80 backdrop-blur-xl border border-black/10 dark:border-white/20 text-[#1e293b] dark:text-white font-anta font-bold tracking-[0.15em] text-[10px] uppercase rounded-xl py-5 shadow-lg transition-all duration-300 group h-10"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* 3: AI Neural Processor (AI Effect) - Now locked to a static Y-axis */}
        <div className="w-full max-w-2xl lg:order-2 order-1 mt-0 lg:mt-4 lg:pl-[1.25%] relative z-10 pt-0 lg:pt-4">
          <div className="relative h-52 lg:h-72 w-full flex items-center justify-center group">
            {/* PCB Depth Gradient - Removed for seamless mixing */}


            <svg viewBox="0 0 600 200" className="w-full lg:w-[90%] h-auto relative z-10 overflow-visible">
              <defs>
                <filter id="blueGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="activeTrace" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* High-Density Active Neural Bus (Procedural) */}
              {Array.from({ length: 40 }).map((_, i) => {
                const side = i % 4; // 0:Left, 1:Right, 2:Top, 3:Bottom
                const offset = (i * 6) % 90;
                let d = "";

                if (side === 0) d = `M 0 ${40 + offset} L 180 ${40 + offset} L 240 ${80 + offset / 2}`;
                if (side === 1) d = `M 600 ${40 + offset} L 420 ${40 + offset} L 360 ${80 + offset / 2}`;
                if (side === 2) d = `M ${200 + offset} 0 L ${200 + offset} 60 L 260 80`;
                if (side === 3) d = `M ${200 + offset} 240 L ${200 + offset} 180 L 260 160`;

                return (
                  <g key={i}>
                    <path d={d} fill="none" stroke="currentColor" className="text-blue-600/40 dark:text-blue-500/10" strokeWidth="0.5" />
                    {/* The "Neural Pulse" Synapse Animation */}
                    <motion.circle r="1" fill="#22d3ee" filter="url(#blueGlow)">
                      <animateMotion
                        dur={`${3 + Math.random() * 4}s`}
                        repeatCount="indefinite"
                        path={d}
                        begin={`${Math.random() * 2}s`}
                      />
                    </motion.circle>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke="url(#activeTrace)"
                      strokeWidth="1.2"
                      initial={{ pathLength: 0, pathOffset: 0 }}
                      animate={{ pathLength: [0, 0.1, 0.1], pathOffset: [0, 0, 1] }}
                      transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "linear" }}
                    />
                  </g>
                );
              })}

              {/* Central Processor Unit - Blue Hardware Core */}
              <g transform="translate(245, 65)">
                {/* Chip Substrate */}
                <rect width="110" height="110" rx="4" className="fill-white dark:fill-[#0f172a] stroke-blue-500/30 dark:stroke-blue-500/20 shadow-sm" strokeWidth="1" />

                {/* Multi-sided Contact Pins - Blue Tinge */}
                {Array.from({ length: 4 }).map((_, side) => (
                  <g key={side} transform={`rotate(${side * 90}, 55, 55)`}>
                    {Array.from({ length: 18 }).map((_, j) => (
                      <rect key={j} x={10 + j * 5} y="-3" width="1.2" height="5" className="fill-blue-600/30 dark:fill-blue-500/30" />
                    ))}
                  </g>
                ))}

                {/* Inner Logic Core Area */}
                <rect x="10" y="10" width="90" height="90" rx="2" className="fill-blue-500/[0.05] dark:fill-blue-500/[0.03] stroke-black/5 dark:stroke-white/5" strokeWidth="1" />

                {/* AI Brand - Brand Blue */}
                <text x="55" y="58" textAnchor="middle" className="text-[34px] font-anta font-bold tracking-wide fill-blue-500">AI</text>

                {/* High-Contrast Technical Labels */}
                <text x="55" y="78" textAnchor="middle" className="text-[12.0px] font-mono tracking-[0.2em] fill-blue-600 dark:fill-cyan-300 font-bold uppercase">KRYONEX</text>
                9
                {/* Active Logic LED */}
                <motion.circle
                  cx="100" cy="10" r="1.5"
                  className="fill-cyan-400 shadow-[0_0_10px_#22d3ee]"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              </g>
            </svg>

            {/* Blue Ambient Underglow - Removed for seamless mixing */}
          </div>
        </div>

        {/* 4: HUD Content Grid (Cards) - Reordered for Mobile Sequence */}
        <div className="w-full max-w-2xl grid grid-cols-2 lg:grid-cols-2 lg:order-1 order-2 gap-3 lg:gap-4 lg:pl-[1.25%] relative z-10 pt-0 lg:pt-0">
          {[
            { icon: <Cpu className="w-5 h-5" />, title: "TECHSTACK", desc: "Interactive topology & neural mapping.", delay: 0.2, color: "blue" },
            { icon: <Database className="w-5 h-5" />, title: "ARCHIVES", desc: "Categorical project versioning systems.", delay: 0.3, color: "red" },
            { icon: <Network className="w-5 h-5" />, title: "TOPOLOGY", desc: "Global infrastructure & ecosystem sync.", delay: 0.4, color: "purple" },
            { icon: <MonitorSmartphone className="w-5 h-5" />, title: "PWA LINK", desc: "Offline readiness & mobile deployment.", delay: 0.5, color: "emerald" },
          ].map((module, i) => {
            const hudColors: Record<string, string> = {
              blue: "bg-blue-500/10 text-blue-500",
              red: "bg-red-500/10 text-red-500",
              purple: "bg-purple-500/10 text-purple-500",
              emerald: "bg-emerald-500/10 text-emerald-500",
            };

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: module.delay }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-white/60 dark:bg-obsidian/40 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-xl group-hover:border-blue-500/30 transition-all duration-300 shadow-sm" />
                <div className="relative p-3 lg:p-5 space-y-2 lg:space-y-3">
                  <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl ${hudColors[module.color] || "bg-slate-500/10 text-slate-500"} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                    {React.cloneElement(module.icon as React.ReactElement<{ className?: string }>, { className: "w-4 h-4 lg:w-5 lg:h-5" })}
                  </div>
                  <div>
                    <h3 className="text-xs lg:text-xs font-anta font-bold tracking-widest text-[#1e293b] dark:text-white uppercase line-clamp-1">{module.title}</h3>
                    <p className="text-[10px] lg:text-[10px] text-[#1e293b]/60 dark:text-slate-500 font-light mt-1 line-clamp-2">{module.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>


      </motion.div>

      {/* Login Form Modal Overlay */}
      <AnimatePresence>
        {showLoginForm && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#fbfbfb]/80 dark:bg-obsidian/80 p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm max-h-[90vh] flex flex-col justify-center"
            >
              <button
                onClick={() => setShowLoginForm(false)}
                className="absolute -top-12 right-0 md:-right-12 md:top-0 z-[70] p-2.5 bg-white/50 dark:bg-white/10 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-full text-[#1e293b] dark:text-white hover:bg-white/80 dark:hover:bg-white/20 transition-all shadow-xl group"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>

              <div
                className="relative group w-full overflow-y-auto custom-scrollbar rounded-[2rem] shadow-[0_12px_40px_rgb(0,0,0,0.1)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.3)] max-h-[85vh]"
              >
                <Card className="border-black/[0.03] dark:border-white/10 bg-white/100 dark:bg-obsidian/90 backdrop-blur-3xl m-0 rounded-[2rem] overflow-hidden">
                  <motion.div className="flex flex-col items-center pt-8 pb-3">
                    <motion.div
                      className="w-48 h-12 bg-[#1e293b] dark:bg-white"
                      style={{
                        maskImage: `url(${logo})`,
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskImage: `url(${logo})`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center'
                      }}
                    />
                    <motion.p
                      className="text-[9px] tracking-[0.4em] text-slate-400 dark:text-slate-500 uppercase font-medium -mt-1"
                    >
                      By <span className="text-[#1e293b] dark:text-white">Ayush Jain</span>
                    </motion.p>
                  </motion.div>

                  <CardHeader className="space-y-3 text-center pt-1 pb-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isSignUp ? 'signup-head' : 'signin-head'}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-1"
                      >
                        <CardTitle className="text-2xl font-anta font-bold tracking-[0.2em] text-[#1e293b] dark:text-white uppercase">
                          {isResettingPassword ? 'RESET' : (isVerifyingReset ? 'VERIFY' : (isForgotPassword ? 'FORGOT PASSWORD' : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')))}
                        </CardTitle>
                      </motion.div>
                    </AnimatePresence>
                  </CardHeader>

                  <CardContent className="space-y-4 px-6 pb-6">
                    <AnimatePresence mode="wait">
                      {!isForgotPassword && !isResettingPassword && !showOtpInput && (
                        <motion.div
                          key="auth-options"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <Button
                            variant="outline"
                            onClick={handleGoogleLogin}
                            className="w-full h-10 gap-3 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-[#1e293b] dark:text-white rounded-xl transition-all duration-300"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                          </Button>

                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-black/10 dark:border-white/10" /></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em] text-[#1e293b]/60 dark:text-slate-500">
                              <span className="bg-white dark:bg-obsidian px-3">OR CONTINUE WITH</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleAuth} className="space-y-5">
                      <AnimatePresence mode="wait">
                        {!showOtpInput ? (
                          <motion.div
                            key={isSignUp ? 'signup-fields' : 'signin-fields'}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                          >
                            {isSignUp && (
                              <div className="space-y-2">
                                <div className="px-1 text-[10px] font-bold tracking-[0.2em] text-[#1e293b]/80 dark:text-slate-400 uppercase">
                                  <label>Identity Label</label>
                                </div>
                                <Input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required={isSignUp}
                                  className="bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[#1e293b] dark:text-white h-10 rounded-xl focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all placeholder:text-[#1e293b]/30 dark:placeholder:text-slate-600" />
                              </div>
                            )}

                            <div className="space-y-2">
                              <div className="px-1 text-[10px] font-bold tracking-[0.2em] text-[#1e293b]/80 dark:text-slate-400 uppercase">
                                <label>Email</label>
                              </div>
                              <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className="bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[#1e293b] dark:text-white h-10 rounded-xl focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all placeholder:text-[#1e293b]/30 dark:placeholder:text-slate-600" />
                            </div>

                            <div className="space-y-2">
                              <div className="px-1 flex justify-between items-center text-[10px] font-bold tracking-[0.2em] text-[#1e293b]/80 dark:text-slate-400 uppercase">
                                <label>Password</label>
                                {!isSignUp && (
                                  <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[#1e293b] dark:text-blue-500 hover:opacity-80 font-bold transition-colors">RESET?</button>
                                )}
                              </div>
                              <div className="relative group">
                                <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required
                                  className="bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[#1e293b] dark:text-white h-10 pr-12 rounded-xl focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all placeholder:text-[#1e293b]/30 dark:placeholder:text-slate-600" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black dark:hover:text-white transition-colors">
                                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="otp"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6 py-2"
                          >
                            <div className="text-center space-y-1">
                              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Verification Pulse</div>
                              <p className="text-xs text-slate-600 dark:text-slate-500 font-light">Code transmitted to <span className="text-black dark:text-white font-medium">{email}</span></p>
                            </div>
                            <div className="space-y-2">
                              <div className="px-1 text-[10px] font-bold tracking-[0.2em] text-[#1e293b]/60 dark:text-slate-400 uppercase text-center">Protocol Token</div>
                              <Input type="text" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6}
                                className="bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[#1e293b] dark:text-white h-14 text-center text-2xl tracking-[0.5em] font-mono focus:ring-1 focus:ring-white/20 rounded-xl" />
                            </div>
                            <div className="flex flex-col items-center gap-2 pt-2">
                              <button type="button" onClick={() => setShowOtpInput(false)} className="text-[10px] text-slate-500 hover:text-black dark:hover:text-white transition-colors uppercase font-bold tracking-widest">Back</button>
                              <button type="button" disabled={!canResend || isLoading} onClick={handleResendOtp}
                                className={`text-[10px] font-bold uppercase tracking-widest ${canResend ? 'text-blue-600 hover:underline' : 'text-slate-400'}`}>
                                {canResend ? 'Resend code' : `Resend in ${resendTimer}s`}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.div>
                        <Button type="submit" disabled={isLoading}
                          className="w-full h-10 bg-[#1e293b] dark:bg-white hover:bg-[#2d3a4f] dark:hover:bg-slate-200 text-white dark:text-black font-anta font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded-xl mt-2 shadow-lg">
                          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (showOtpInput ? 'VERIFY CODE' : (isSignUp ? 'INITIALIZE CODE' : 'INITIALIZE SESSION'))}
                        </Button>
                      </motion.div>
                    </form>

                    <div className="flex justify-center pt-2">
                      <p className="text-xs text-[#1e293b]/60 dark:text-slate-500 tracking-[0.2em] uppercase font-bold">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#1e293b] dark:text-white hover:underline transition-all">
                          {isSignUp ? 'Sign in' : 'Sign up'}
                        </button>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

