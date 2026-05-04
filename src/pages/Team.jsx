import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTenant } from "../context/TenantContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { Navigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { UserPlus, Trash2, User, Briefcase } from "lucide-react";

export default function Team() {
    const { store } = useTenant();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [members, setMembers] = useState([]);
    const [employees, setEmployees] = useState([]); // HR employees for badge matching
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("staff");
    const [inviteName, setInviteName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Security: Redirect Staff
    if (store?.role === 'staff') {
        return <Navigate to="/dashboard" replace />;
    }

    useEffect(() => {
        if (store) {
            fetchMembers();
            fetchEmployees();
            // If redirected from HR with prefill data, apply it
            const prefill = sessionStorage.getItem('hr_invite_prefill');
            if (prefill) {
                try {
                    const { name, email } = JSON.parse(prefill);
                    setInviteName(name || '');
                    setInviteEmail(email || '');
                } catch (err) {
                    console.warn("Session storage prefill error:", err);
                }
                sessionStorage.removeItem('hr_invite_prefill');
            }
        }
    }, [store]);

    const fetchMembers = async () => {
        try {
            const q = query(collection(db, "allowed_users"), where("storeId", "==", store.id));
            const snapshot = await getDocs(q);
            setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching team:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const q = query(collection(db, "employees"), where("storeId", "==", store.id), where("status", "==", "active"));
            const snap = await getDocs(q);
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Fetch employees failed:", err);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const q = query(
                collection(db, "allowed_users"),
                where("storeId", "==", store.id),
                where("email", "==", inviteEmail)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                toast.error(t('msg_member_exists'));
                setSubmitting(false);
                return;
            }

            await addDoc(collection(db, "allowed_users"), {
                storeId: store.id,
                email: inviteEmail,
                name: inviteName,
                role: inviteRole,
                createdAt: new Date()
            });

            setInviteEmail("");
            setInviteName("");
            fetchMembers();
            toast.success(t('msg_member_added'));
        } catch (error) {
            console.error(error);
            toast.error(t('err_add_member'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (id, memberEmail) => {
        if (memberEmail === user?.email) {
            toast.error(t('msg_cannot_remove_self'));
            return;
        }
        if (!window.confirm(t('confirm_remove_member'))) return;
        try {
            await deleteDoc(doc(db, "allowed_users", id));
            fetchMembers();
        } catch (error) {
            console.error("Error removing member:", error);
            toast.error(t('err_remove_member'));
        }
    };

    // Build a Set of employee emails for quick badge lookup
    const employeeEmailSet = new Set(employees.map(e => e.email?.toLowerCase()).filter(Boolean));

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('page_title_team')}</h1>
                <p className="mt-1 text-sm text-gray-500">{t('page_subtitle_team')}</p>
            </div>

            {/* Invite Form */}
            <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-indigo-600" />
                    {t('title_add_member')}
                </h3>
                <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <Input
                            label={t('label_full_name')}
                            placeholder={t('placeholder_customer_name')}
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <Input
                            label={t('label_email')}
                            type="email"
                            placeholder="john@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_role')}</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                        >
                            <option value="staff">{t('role_staff')}</option>
                            <option value="manager">{t('role_manager')}</option>
                        </select>
                    </div>
                    <Button type="submit" isLoading={submitting}>
                        {t('btn_add_member')}
                    </Button>
                </form>
            </div>

            {/* Members List */}
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-100">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {t('title_current_team', { count: members.length })}
                    </h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-4 text-center">{t('loading')}...</div>
                    ) : members.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">{t('msg_no_team')}</div>
                    ) : (
                        members.map((member) => {
                            const isHREmployee = employeeEmailSet.has(member.email?.toLowerCase());
                            return (
                                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-100 p-2 rounded-full">
                                            <User className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                                                {/* HR badge: shown when this member exists as an employee in RH */}
                                                {isHREmployee && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                                                        <Briefcase className="w-2.5 h-2.5" /> RH
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">{member.email}</p>
                                        </div>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {member.role?.toUpperCase()}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(member.id, member.email)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                        title="Remove Access"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
