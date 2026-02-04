import { useState, useMemo } from 'react';
import { useStoreData } from '../hooks/useStoreData';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Truck, CheckCircle, AlertCircle, Phone, ShoppingBag, RefreshCw } from 'lucide-react';
import Button from '../components/Button';
import OrderModal from '../components/OrderModal';
import AddEventModal from '../components/AddEventModal'; // NEW
import { useOrderActions } from '../hooks/useOrderActions';
import { toast } from 'react-hot-toast'; // Missing toast import

export default function Planning() {
    const { store } = useTenant();
    const { t, language } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Modals
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false); // NEW
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Data Fetching
    const { data: orders, loading: ordersLoading } = useStoreData("orders");
    const { data: customEvents, loading: eventsLoading } = useStoreData("events"); // NEW

    // Calendar Calculations
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = useMemo(() => {
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [startDate, endDate]);

    // Group Tasks by Date
    const tasksByDate = useMemo(() => {
        const groups = {};

        // 1. Orders
        if (orders) {
            orders.forEach(order => {
                if (order.followUpDate) {
                    const dateKey = order.followUpDate.split('T')[0];
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push({
                        type: 'order_task',
                        data: order,
                        title: `${order.clientName} (${order.orderNumber})`,
                        time: order.followUpDate.includes('T') ? order.followUpDate.split('T')[1].substring(0, 5) : null
                    });
                }
            });
        }

        // 2. Custom Events
        if (customEvents) {
            customEvents.forEach(event => {
                const dateKey = event.date; // already YYYY-MM-DD
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push({
                    type: 'custom_event',
                    data: event,
                    title: event.title,
                    time: event.time,
                    icon: event.type // ramassage, livraison, etc
                });
            });
        }

        return groups;
    }, [orders, customEvents]);

    const selectedDayTasks = useMemo(() => {
        const key = format(selectedDate, 'yyyy-MM-dd');
        return tasksByDate[key] || [];
    }, [selectedDate, tasksByDate]);

    // Handlers
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const onDateClick = (day) => setSelectedDate(day);

    const handleOpenOrder = (order) => {
        setSelectedOrder(order);
        setIsOrderModalOpen(true);
    };

    const isDaySelected = (day) => isSameDay(day, selectedDate);

    // Logic for updating task status (reused from Dashboard)
    const { updateOrder } = useOrderActions();
    const handleToggleTask = async (taskItem) => {
        const order = taskItem.data;
        // Toggle logic: If no note "DONE", add it. If "DONE", remove it? 
        // Actually, let's use a clear 'isTaskDone' flag if we supported it, 
        // but for now, let's stick to the previous request: 
        // "Show it as crossed out". We can use a special prefix in the note or a new field.
        // Let's assume we added 'isTaskDone' field in the implementation plan.

        const newStatus = !order.isTaskDone;
        await updateOrder(order.id, order, { ...order, isTaskDone: newStatus });
        toast.success(newStatus ? t('msg_task_done') : t('msg_task_reopened'));
    };

    const locale = language === 'fr' ? fr : enUS;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 lg:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('planning_title') || "Planning"}</h1>
                    <p className="text-sm text-gray-500">{format(currentDate, 'MMMM yyyy', { locale })}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>{t('btn_today') || "Today"}</Button>
                    <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-50 border-r border-gray-200"><ChevronLeft className="h-5 w-5" /></button>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-50"><ChevronRight className="h-5 w-5" /></button>
                    </div>
                    {/* Add Event Button Placeholder */}
                    <Button icon={Plus} onClick={() => setIsEventModalOpen(true)}>{t('btn_add_event') || "Add Event"}</Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 overflow-hidden">
                {/* Calendar Grid */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden order-2 lg:order-1">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {format(addMonths(startDate, 0), 'EEEE', { locale }).split(' ')[0]} {/* Simple Hack, needs proper locale mapping */}
                                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i]}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-6">
                        {calendarDays.map((day, dayIdx) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayTasks = tasksByDate[dateKey] || [];
                            const isSelected = isDaySelected(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => onDateClick(day)}
                                    className={`
                                        relative border-b border-r border-gray-100 p-2 transition-colors cursor-pointer
                                        ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white'}
                                        ${isSelected ? 'ring-2 ring-inset ring-indigo-600 z-10' : 'hover:bg-gray-50'}
                                    `}
                                >
                                    <span className={`
                                        text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full
                                        ${isToday(day) ? 'bg-indigo-600 text-white' : ''}
                                    `}>
                                        {format(day, 'd')}
                                    </span>

                                    {/* Task Dots/Preview */}
                                    <div className="mt-1 space-y-1">
                                        {dayTasks.slice(0, 3).map((task, i) => (
                                            <div key={i} className={`text-[10px] truncate px-1.5 py-0.5 rounded border ${task.data.isTaskDone ? 'bg-gray-100 text-gray-400 line-through' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                {task.time} {task.title}
                                            </div>
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <div className="text-[10px] text-gray-400 pl-1">
                                                +{dayTasks.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Side Panel (Selected Day) */}
                <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col order-1 lg:order-2 h-64 lg:h-auto shrink-0">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                        <h2 className="font-bold text-gray-900">{format(selectedDate, 'EEEE, d MMMM', { locale })}</h2>
                        <p className="text-xs text-gray-500 mt-1">{selectedDayTasks.length} tasks scheduled</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedDayTasks.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No tasks for this day.</p>
                                <Button variant="ghost" size="sm" onClick={() => setIsEventModalOpen(true)} className="mt-2 text-indigo-600">Add Event</Button>
                            </div>
                        ) : (
                            selectedDayTasks.map((task, i) => (
                                <div key={i} className={`p-3 rounded-lg border transition-all ${task.type === 'custom_event'
                                    ? 'bg-blue-50 border-blue-200'
                                    : (task.data.isTaskDone ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 shadow-sm hover:border-indigo-300')
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {task.type === 'order_task' ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleTask(task); }}
                                                className={`mt-1 h-5 w-5 flex-shrink-0 rounded-full border flex items-center justify-center transition-colors ${task.data.isTaskDone ? 'bg-green-100 border-green-200 text-green-600' : 'border-gray-300 hover:border-indigo-500'}`}
                                            >
                                                {task.data.isTaskDone && <CheckCircle className="h-3.5 w-3.5" />}
                                            </button>
                                        ) : (
                                            <div
                                                className="mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full"
                                                style={{ color: task.data.color || '#3B82F6', backgroundColor: `${task.data.color || '#3B82F6'}20` }}
                                            >
                                                {task.icon === 'ramassage' && <Truck className="h-3.5 w-3.5" />}
                                                {task.icon === 'livraison' && <Clock className="h-3.5 w-3.5" />}
                                                {task.icon === 'confirmation' && <Phone className="h-3.5 w-3.5" />}
                                                {task.icon === 'custom_collection' && <ShoppingBag className="h-3.5 w-3.5" />}
                                                {task.icon === 'retour' && <RefreshCw className="h-3.5 w-3.5" />}
                                                {task.icon === 'other' && <AlertCircle className="h-3.5 w-3.5" />}
                                            </div>
                                        )}

                                        <div className="flex-1 cursor-pointer" onClick={() => task.type === 'order_task' && handleOpenOrder(task.data)}>
                                            <p className={`text-sm font-medium ${task.data.isTaskDone ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {task.time || "All day"}
                                            </p>
                                            {task.type === 'custom_event' && task.data.notes && (
                                                <p
                                                    className="text-xs p-1.5 rounded mt-2 opacity-90 text-white"
                                                    style={{ backgroundColor: task.data.color || '#3B82F6' }}
                                                >
                                                    "{task.data.notes}"
                                                </p>
                                            )}
                                            {task.type === 'order_task' && task.data.followUpNote && (
                                                <p className="text-xs text-yellow-700 bg-yellow-50 p-1.5 rounded mt-2">
                                                    "{task.data.followUpNote}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <OrderModal
                isOpen={isOrderModalOpen}
                onClose={() => { setIsOrderModalOpen(false); setSelectedOrder(null); }}
                order={selectedOrder}
                onSave={() => { }} // Reload happens via hook
            />

            <AddEventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                defaultDate={selectedDate}
                onSave={() => { }} // Auto reload hooks
            />
        </div>
    );
}
