import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLeads } from '../lib/db';
import { format } from 'date-fns';

export default function Leads() {
    const [leads, setLeads] = useState([]);
    const [filteredLeads, setFilteredLeads] = useState([]);
    const [filters, setFilters] = useState({
        status: '',
        stage: '',
        search: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        loadLeads();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, leads]);

    const loadLeads = async () => {
        const data = await getLeads();
        // Sort by next follow up date default? or created at?
        // Let's sort by nextFollowUpDate ascending (soonest first)
        data.sort((a, b) => {
            if (!a.nextFollowUpDate) return 1;
            if (!b.nextFollowUpDate) return -1;
            return new Date(a.nextFollowUpDate) - new Date(b.nextFollowUpDate);
        });
        setLeads(data);
    };

    const applyFilters = () => {
        let result = leads;
        if (filters.status) {
            result = result.filter(l => l.currentStatus === filters.status);
        }
        if (filters.stage) {
            result = result.filter(l => l.leadStage === filters.stage);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(l =>
                l.restaurantName.toLowerCase().includes(q) ||
                l.phone.includes(q) ||
                l.city.toLowerCase().includes(q)
            );
        }
        setFilteredLeads(result);
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const stageColors = {
        'Cold': 'badge-cold',
        'Warm': 'badge-warm',
        'Hot': 'badge-hot',
        'Closed': 'badge-closed'
    };

    const statusColors = {
        'New': 'badge-new',
        'Call not picked up': 'badge-cold',
        'Sent details on WhatsApp': 'badge-cold',
        'Follow up': 'badge-pending',
        'On going': 'badge-warm',
        'Fake lead': 'badge-not-interested',
        'Reject': 'badge-not-interested'
    };

    return (
        <div className="container">
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
                <h1>Leads</h1>
                <Link to="/leads/new" className="btn">Add Lead</Link>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="label">Search</label>
                        <input
                            type="text"
                            name="search"
                            className="input"
                            placeholder="Name, Phone, City..."
                            value={filters.search}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div style={{ width: '200px' }}>
                        <label className="label">Status</label>
                        <select name="status" className="input" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All Statuses</option>
                            <option value="New">New</option>
                            <option value="Call not picked up">Call not picked up</option>
                            <option value="Sent details on WhatsApp">Sent details on WhatsApp</option>
                            <option value="Follow up">Follow up</option>
                            <option value="On going">On going</option>
                            <option value="Fake lead">Fake lead</option>
                            <option value="Reject">Reject</option>
                        </select>
                    </div>
                    <div style={{ width: '200px' }}>
                        <label className="label">Stage</label>
                        <select name="stage" className="input" value={filters.stage} onChange={handleFilterChange}>
                            <option value="">All Stages</option>
                            <option value="Cold">Cold</option>
                            <option value="Warm">Warm</option>
                            <option value="Hot">Hot</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Restaurant Name</th>
                                <th>Phone</th>
                                <th>City</th>
                                <th>Status</th>
                                <th>Stage</th>
                                <th>Next Follow-up</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map(lead => (
                                <tr key={lead.leadId} onClick={() => navigate(`/leads/${lead.leadId}`)} style={{ cursor: 'pointer', transition: 'background-color 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ fontWeight: 500 }}>{lead.restaurantName}</td>
                                    <td>{lead.phone}</td>
                                    <td>{lead.city}</td>
                                    <td>
                                        <span className={`badge ${statusColors[lead.currentStatus] || 'badge-cold'}`}>
                                            {lead.currentStatus}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${stageColors[lead.leadStage] || 'badge-cold'}`}>
                                            {lead.leadStage}
                                        </span>
                                    </td>
                                    <td>
                                        {lead.nextFollowUpDate ? format(new Date(lead.nextFollowUpDate), 'MMM d, yyyy') : '-'}
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                        No leads found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
