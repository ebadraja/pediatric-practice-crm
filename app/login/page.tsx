'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Stethoscope,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

export default function LoginPage() {
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setStep('2fa');
      setIsLoading(false);
    }, 1500);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call and redirect
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT SIDE - Features */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-sm">Kids 0-18 Pediatrics</span>
          </div>

          <h1 className="text-5xl font-bold text-white mb-3 leading-tight">
            Kids 0-18 Integrated Pediatrics
          </h1>
          <p className="text-xl text-blue-200 mb-12">
            HIPAA-Compliant Patient Management System
          </p>

          {/* Features */}
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-slate-100">Secure & Encrypted</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-green-400" />
              <span className="text-slate-100">AI-Powered Voice & Chat</span>
            </div>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-green-400" />
              <span className="text-slate-100">Complete Patient Insights</span>
            </div>
          </div>

          {/* Testimonial */}
          <div className="border-l-4 border-blue-400 pl-4">
            <p className="text-slate-200 italic">
              "This system has transformed how we manage patient care and communications. The AI voice agent has reduced our administrative burden by 40% while improving patient satisfaction."
            </p>
            <p className="text-slate-400 text-sm mt-2">
              — Dr. Jonathan Tamas, Practice Director
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-slate-400 text-xs">
          © 2026 Kids 0-18 Pediatrics. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md animate-in fade-in-up duration-500">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">
              Kids 0-18 Pediatrics
            </span>
          </div>

          {step === 'login' ? (
            <>
              {/* Login Form */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
                <p className="text-slate-600 text-sm mt-2">
                  Sign in to access your dashboard
                </p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-5">
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10 bg-slate-50 border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-10 bg-slate-50 border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label
                      htmlFor="remember"
                      className="text-slate-600 text-sm font-normal cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Forgot password?
                  </a>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium mt-6"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-xs text-slate-500 font-medium">OR</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* SSO Button */}
              <Button
                variant="outline"
                className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium gap-2"
              >
                <Shield className="w-4 h-4" />
                Sign in with SSO
              </Button>

              {/* Footer Text */}
              <div className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
                <p className="mb-3">
                  Don't have an account?{' '}
                  <span className="text-slate-700 font-medium">
                    Contact your administrator
                  </span>
                </p>
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Need help signing in?
                </a>
              </div>
            </>
          ) : (
            <>
              {/* 2FA Form */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900">Verify Your Identity</h2>
                <p className="text-slate-600 text-sm mt-2">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                {/* Code Inputs */}
                <div className="flex gap-3 justify-center">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      className="w-12 h-12 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  ))}
                </div>

                {/* Verify Button */}
                <Button
                  type="submit"
                  disabled={isLoading || code.some((c) => !c)}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Button>
              </form>

              {/* Links */}
              <div className="mt-6 space-y-3 text-center">
                <button className="block text-blue-600 hover:text-blue-700 font-medium text-sm w-full">
                  Use backup code instead
                </button>
                <button
                  onClick={() => {
                    setStep('login');
                    setCode(['', '', '', '', '', '']);
                  }}
                  className="block text-slate-600 hover:text-slate-700 font-medium text-sm w-full"
                >
                  Back to login
                </button>
              </div>
            </>
          )}

          {/* HIPAA Notice */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
            Protected by industry-standard encryption. This system is HIPAA-compliant.
          </div>
        </div>
      </div>
    </div>
  );
}
