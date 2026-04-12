import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { LogIn, UserPlus, Github, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { supabase } from '@/src/lib/supabase';
import logo from '../logo.png';
import { toast } from 'sonner';

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
      if (lastEvent.current === 'SIGNED_OUT') return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(isUserAdmin(session.user.email) ? '/admin' : '/portal');
      }
    };
    checkSession();

    // Detect auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      lastEvent.current = event;
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      } else if (event === 'SIGNED_IN' && session) {
        navigate(isUserAdmin(session.user.email) ? '/admin' : '/portal');
      } else if (event === 'SIGNED_OUT') {
        // Force stay on login page
        setIsResettingPassword(false);
        setIsForgotPassword(false);
        setIsVerifyingReset(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    try {
      const redirectUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.origin
        : 'https://kryonex.dev';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error('Google login failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pearl dark:bg-obsidian p-4 transition-colors duration-300 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 dark:bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/10 dark:bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-slate-200 bg-white/40 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:bg-white/5 dark:border-graphite dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="flex justify-center mb-2 mt-4">
              <motion.div
                key={isSignUp ? 'signup' : 'login'}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full h-24 flex items-center justify-center overflow-hidden"
              >
                <div
                  className="w-full h-full bg-graphite dark:bg-white"
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
              </motion.div>
            </div>
            <CardTitle className="text-2xl font-anta font-bold tracking-[0.2em] text-graphite dark:text-white uppercase">
              {isResettingPassword ? 'Reset Password' : (isVerifyingReset ? 'Verify Identity' : (isForgotPassword ? 'Forgot Password' : (isSignUp ? 'Create Account' : 'Sign In')))}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              {isResettingPassword 
                ? 'Enter your new security credentials' 
                : (isVerifyingReset
                    ? `Enter the code sent to ${email}`
                    : (isForgotPassword 
                        ? 'Enter your email to receive a reset code' 
                        : (isSignUp ? 'Enter your details to get started' : 'Enter your credentials to access your portfolio')))}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!isForgotPassword && !isResettingPassword && !showOtpInput && (
              <>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleGoogleLogin}
                    className="w-full gap-2 bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200 dark:border-graphite/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-pearl dark:bg-obsidian px-2 text-slate-500 dark:text-slate-400 rounded-full">
                      Or continue with
                    </span>
                  </div>
                </div>
              </>
            )}

            {isResettingPassword ? (
              <form onSubmit={handleUpdatePassword} className="space-y-6 pt-2">
                <div className="space-y-2">
                  <div className="px-1">
                    <label className="text-[10px] font-anta font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase">
                      New Security Key
                    </label>
                  </div>
                  <div className="relative group">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="font-mono pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-11 text-sm font-anta tracking-widest uppercase shadow-lg gap-2">
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Set New Password'}
                </Button>
              </form>
            ) : isForgotPassword ? (
              <form onSubmit={isVerifyingReset ? handleVerifyResetOtp : handleResetRequest} className="space-y-4">
                {!isVerifyingReset ? (
                  <div className="space-y-2">
                    <div className="px-1">
                      <label className="text-[10px] font-anta font-bold tracking-[0.15em] text-slate-500 dark:text-slate-400 uppercase">
                        Account Identifier
                      </label>
                    </div>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="font-mono"
                    />
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="px-1">
                        <label className="text-[10px] font-anta font-bold tracking-[0.15em] text-slate-500 dark:text-slate-400 uppercase">
                          Verification Pulse
                        </label>
                      </div>
                      <Input
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={6}
                        className="text-center text-lg tracking-[0.5em] font-mono"
                      />
                    </div>
                  </motion.div>
                )}
                <Button type="submit" disabled={isLoading} className="w-full h-11 text-sm font-anta tracking-widest uppercase shadow-lg gap-2">
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isVerifyingReset ? 'Verify Identity' : 'Send Reset Code')}
                </Button>
                
                <div className="flex flex-col items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setIsVerifyingReset(false);
                    }}
                    className="text-xs text-slate-500 hover:text-graphite dark:hover:text-white transition-colors"
                  >
                    Back to Sign In
                  </button>
                  {isVerifyingReset && (
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <span>Didn't receive a code?</span>
                      <button
                        type="button"
                        disabled={!canResend || isLoading}
                        onClick={handleResendOtp}
                        className={`font-bold transition-colors ${canResend ? 'text-indigo-600 dark:text-indigo-400 hover:underline' : 'text-slate-400 cursor-not-allowed'}`}
                      >
                        {canResend ? 'Resend' : `Resend in ${resendTimer}s`}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                {!showOtpInput ? (
                  <>
                    <AnimatePresence mode="wait">
                      {isSignUp && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-2">
                            <div className="px-1">
                              <label className="text-[10px] font-anta font-bold tracking-[0.15em] text-slate-500 dark:text-slate-400 uppercase">
                                Identity Label
                              </label>
                            </div>
                            <Input
                              type="text"
                              placeholder="John Doe"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required={isSignUp}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <div className="px-1">
                        <label className="text-[10px] font-anta font-bold tracking-[0.15em] text-slate-500 dark:text-slate-400 uppercase">
                          Access Key (Email)
                        </label>
                      </div>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-anta font-bold tracking-[0.15em] text-slate-500 dark:text-slate-400 uppercase">
                          Security Cipher
                        </label>
                        {!isSignUp && (
                          <button 
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-[10px] text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase font-bold tracking-widest px-1"
                          >
                            Reset?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="font-mono pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2 mb-2">
                      <div className="text-[9px] font-anta font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em]">Verification Required</div>
                      <p className="text-[9px] text-slate-500 px-4">A 6-digit pulse has been transmitted to <span className="font-semibold text-graphite dark:text-white">{email}</span></p>
                    </div>

                    <div className="space-y-2">
                      <div className="px-1">
                        <label className="text-[10px] font-anta font-bold tracking-[0.15em] text-slate-500 dark:text-slate-400 uppercase">
                          Identity Protocol
                        </label>
                      </div>
                      <Input
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={6}
                        className="text-center text-lg tracking-[0.5em] font-mono"
                      />
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => setShowOtpInput(false)}
                        className="text-[9px] text-slate-500 hover:text-graphite dark:hover:text-white transition-colors uppercase font-bold tracking-widest"
                      >
                        Back to registration
                      </button>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span>Missing code?</span>
                        <button
                          type="button"
                          disabled={!canResend || isLoading}
                          onClick={handleResendOtp}
                          className={`font-bold transition-colors ${canResend ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 cursor-not-allowed'}`}
                        >
                          {canResend ? 'Retransmit' : `Retransmit in ${resendTimer}s`}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full h-11 text-sm font-anta tracking-widest uppercase shadow-lg gap-2 mt-4">
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    showOtpInput ? 'Verify Protocol' : (isSignUp ? 'Initialize Code' : 'Initialize Session')
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 dark:border-white/5 pt-4 pb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isResettingPassword 
                ? 'Back to ' 
                : (isSignUp ? 'Already have an account?' : "Don't have an account?")}{' '}
              <button
                onClick={() => {
                  if (isResettingPassword) {
                    setIsResettingPassword(false);
                    navigate('/');
                  } else {
                    setIsSignUp(!isSignUp);
                    setIsForgotPassword(false);
                  }
                }}
                className="font-semibold text-graphite dark:text-white hover:underline focus:outline-none"
              >
                {isResettingPassword ? 'Sign In' : (isSignUp ? 'Sign in' : 'Sign up')}
              </button>
            </p>
          </CardFooter>
        </Card>
        <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          by <span className="text-graphite dark:text-white font-anta tracking-wide">Ayush Jain</span>
        </p>
      </motion.div>
    </div>
  );
}
