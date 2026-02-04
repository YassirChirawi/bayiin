import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";

/**
 * HelpTooltip Component
 * @param {string} topic - The section ID in /help page (e.g., 'dashboard', 'orders')
 * @param {string} className - Optional styling
 */
export default function HelpTooltip({ topic, className = "" }) {
    const navigate = useNavigate();

    const handleClick = (e) => {
        e.stopPropagation(); // Prevent parent clicks (like card expansion)
        if (topic) {
            navigate(`/help#${topic}`);
        } else {
            navigate('/help');
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`cursor-pointer hover:bg-gray-100 p-1 rounded-full text-indigo-400 hover:text-indigo-600 transition-colors ${className}`}
            title="Read more in Help"
        >
            <Info className="h-4 w-4" />
        </button>
    );
}
