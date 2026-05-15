import React from 'react';
import { motion } from 'framer-motion';
import './Checkbox.css';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className={`checkbox-wrapper ${className} ${disabled ? 'disabled' : ''}`}>
      <motion.div
        className={`checkbox-box ${checked ? 'checked' : ''}`}
        whileTap={disabled ? {} : { scale: 0.85 }}
        whileHover={disabled ? {} : { scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="checkbox-input"
        />
        {checked && (
          <motion.svg
            className="checkbox-check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <motion.path
              d="M3.5 8L6.5 11L12.5 5"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            />
          </motion.svg>
        )}
      </motion.div>
      <span className="checkbox-label">{label}</span>
    </label>
  );
};

export default Checkbox;
