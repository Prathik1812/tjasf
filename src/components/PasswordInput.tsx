import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = '',
  required = false,
  className = 'w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#eb5526]',
  id,
  name,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex items-center w-full">
      <input
        type={showPassword ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        id={id}
        name={name}
        className={className}
      />
      <button
        type="button"
        onMouseDown={() => setShowPassword(true)}
        onMouseUp={() => setShowPassword(false)}
        onMouseLeave={() => setShowPassword(false)}
        onTouchStart={() => setShowPassword(true)}
        onTouchEnd={() => setShowPassword(false)}
        onTouchCancel={() => setShowPassword(false)}
        className="absolute right-3 text-gray-400 hover:text-[#eb5526] select-none cursor-pointer focus:outline-none p-1"
        title="Press & hold to reveal password"
        aria-label="Press and hold to reveal password"
      >
        {showPassword ? <Eye size={18} className="text-[#eb5526]" /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}
