import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass, getButtonStyle } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';

export default function ImageTextStandard({ section, theme, onUpdate }) {
    const { title, subtitle, content, ctaText, settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    const btnClass = `px-8 py-4 text-white font-bold text-lg hover:scale-105 transition-transform ${getButtonStyle(theme.buttonStyle)}`;
    const imgPos = settings.imagePosition || 'left';

    return (
        <div className={`px-6 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className={`max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row gap-16 items-center ${imgPos === 'right' ? 'md:flex-row-reverse' : ''}`}>
                <div className="w-full md:w-1/2 aspect-[4/3] md:h-[600px] bg-slate-200 rounded-3xl overflow-hidden shadow-2xl relative">
                    {settings.imageUrl ? (
                        <img src={settings.imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                            <ImageIcon size={64} className="text-slate-400" />
                        </div>
                    )}
                </div>
                <div className={`w-full md:w-1/2 ${alignClass}`}>
                    <EditableText
                        value={title}
                        onChange={(val) => onUpdate?.({ title: val })}
                        as="h2"
                        className="text-3xl md:text-5xl font-black mb-6 leading-tight drop-shadow-sm"
                        isReadOnly={!onUpdate}
                    />
                    <EditableText
                        value={subtitle}
                        onChange={(val) => onUpdate?.({ subtitle: val })}
                        as="p"
                        className="text-xl opacity-80 mb-8 font-medium drop-shadow-sm"
                        isReadOnly={!onUpdate}
                    />
                    {content && (
                        <EditableText
                            value={content}
                            onChange={(val) => onUpdate?.({ content: val })}
                            as="p"
                            className="text-lg leading-relaxed opacity-90 mb-10 drop-shadow-sm"
                            isReadOnly={!onUpdate}
                        />
                    )}
                    {ctaText && (
                        <button className={`${btnClass} shadow-xl`} style={{ backgroundColor: theme.primaryColor }}>
                            <EditableText
                                value={ctaText}
                                onChange={(val) => onUpdate?.({ ctaText: val })}
                                as="span"
                                isReadOnly={!onUpdate}
                            />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
