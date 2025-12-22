
import React, { useState } from 'react';
import { PresetView } from './PresetView';
import { Button } from './Button';
import { Language, LightboxItem } from '../types';

interface TestModuleViewProps {
  onViewImage: (items: LightboxItem[], index: number) => void;
  language: Language;
}

export const TestModuleView: React.FC<TestModuleViewProps> = (props) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'EKKO' && password === 'EKKO123') {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Invalid username or password');
    }
  };

  if (isLoggedIn) {
    return <PresetView {...props} />;
  }

  return (
    <div className="flex items-center justify-center min-h-[600px] animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-soft border border-gray-100">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
             🔒
           </div>
           <h2 className="text-2xl font-bold text-gray-800">Restricted Access</h2>
           <p className="text-gray-500 text-sm mt-2">Please log in to access the Test Module.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
           <div>
             <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Account Name</label>
             <input 
               type="text" 
               value={username}
               onChange={e => setUsername(e.target.value)}
               className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
               placeholder="Enter username"
             />
           </div>
           
           <div>
             <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Password</label>
             <input 
               type="password" 
               value={password}
               onChange={e => setPassword(e.target.value)}
               className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
               placeholder="Enter password"
             />
           </div>

           {error && (
             <div className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg font-medium">
               {error}
             </div>
           )}

           <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-glow">
             Login
           </Button>
        </form>
      </div>
    </div>
  );
};
