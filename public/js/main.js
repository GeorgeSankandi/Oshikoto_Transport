document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Chatbot State Persistence (MODIFIED) ---
    const keepChatOpen = localStorage.getItem('keepChatOpen');
    const chatWindow = document.getElementById('chat-window');
    if (keepChatOpen === 'true' && chatWindow) {
        // If the flag is set, open the chat window automatically
        chatWindow.style.display = 'flex';
        setTimeout(() => {
            chatWindow.classList.remove('hidden');
        }, 10);
        // Remove the flag so it doesn't reopen on manual reloads
        localStorage.removeItem('keepChatOpen');
    }

    // --- 2. DOM Persistence (Scroll & Tabs) ---
    // Restore Scroll Position
    const sidebarScroll = localStorage.getItem('sidebarScroll');
    if (sidebarScroll) {
        window.scrollTo(0, parseInt(sidebarScroll));
    }
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('sidebarScroll', window.scrollY);
    });

    // Restore Active Bootstrap Tab (for Dashboards)
    var activeTab = localStorage.getItem('activeTab');
    if (activeTab) {
        var tabTrigger = document.querySelector(`button[data-bs-target="${activeTab}"]`);
        if (tabTrigger) {
            var tab = new bootstrap.Tab(tabTrigger);
            tab.show();
        }
    }

    // Save Active Tab on Click
    var tabLinks = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabLinks.forEach(function(tabLink) {
        tabLink.addEventListener('shown.bs.tab', function(event) {
            var target = event.target.getAttribute('data-bs-target');
            localStorage.setItem('activeTab', target);
        });
    });

    // --- 3. Chatbot Logic (With Navigation Capability) ---
    const chatIcon = document.getElementById('chat-icon');
    const closeChat = document.getElementById('close-chat');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBody = document.getElementById('chat-body');

    if (chatIcon) {
        chatIcon.addEventListener('click', (e) => {
            e.stopPropagation(); 
            
            if (chatWindow.classList.contains('hidden')) {
                // Open
                chatWindow.style.display = 'flex'; 
                setTimeout(() => {
                    chatWindow.classList.remove('hidden');
                }, 10);
            } else {
                // Close
                chatWindow.classList.add('hidden');
                setTimeout(() => {
                    chatWindow.style.display = 'none';
                }, 300); 
            }
        });

        closeChat.addEventListener('click', (e) => {
            e.stopPropagation();
            chatWindow.classList.add('hidden');
            setTimeout(() => {
                chatWindow.style.display = 'none';
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!chatWindow.classList.contains('hidden') && 
                !chatWindow.contains(e.target) && 
                !chatIcon.contains(e.target)) {
                
                chatWindow.classList.add('hidden');
                setTimeout(() => {
                    chatWindow.style.display = 'none';
                }, 300);
            }
        });

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userMessage = chatInput.value.trim();
            if (!userMessage) return;

            // Display user's message
            appendMessage(userMessage, 'sent');
            chatInput.value = '';

            // Show typing indicator
            const typingIndicator = appendMessage('...', 'received', true);

            try {
                // Send message to the backend
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: userMessage }),
                });

                if (!res.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await res.json();
                let replyText = data.reply;
                let navigateUrl = null;

                // --- NAVIGATION LOGIC ---
                // Check if the AI wants to navigate
                if (replyText.includes('||NAVIGATE:')) {
                    const parts = replyText.split('||NAVIGATE:');
                    replyText = parts[0].trim(); // The text part
                    const urlPart = parts[1].split('||')[0]; // The URL part
                    navigateUrl = urlPart.trim();
                }
                
                // Remove typing indicator and show AI response
                typingIndicator.remove();
                appendMessage(replyText, 'received');

                // Perform navigation if requested
                if (navigateUrl) {
                    // Create a small visual cue or just redirect
                    const navMsg = document.createElement('div');
                    navMsg.classList.add('message', 'received');
                    navMsg.innerHTML = `<p class="fst-italic text-muted"><i class="fas fa-spinner fa-spin me-1"></i> Opening page...</p>`;
                    chatBody.appendChild(navMsg);
                    chatBody.scrollTop = chatBody.scrollHeight;

                    // MODIFIED: Set the flag before navigating
                    localStorage.setItem('keepChatOpen', 'true');

                    setTimeout(() => {
                        window.location.href = navigateUrl;
                    }, 1000); // 1-second delay so user can read the message first
                }

            } catch (error) {
                typingIndicator.remove();
                appendMessage('Sorry, I seem to be having trouble right now. Please try again later.', 'received');
                console.error('Chatbot fetch error:', error);
            }
        });

        function appendMessage(text, type, isTyping = false) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', type);
            
            const p = document.createElement('p');
            // Allow basic HTML for formatting if needed, but textContent is safer generally. 
            // For the bot response we use innerHTML to allow newlines/formatting if markdown is parsed, 
            // but here we stick to text to prevent XSS, handling newlines with CSS.
            p.innerText = text; 
            
            if(isTyping) p.classList.add('typing');

            messageDiv.appendChild(p);
            chatBody.appendChild(messageDiv);
            chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll
            return messageDiv;
        }
    }

    // --- 4. Live Sale Timer Logic ---
    const countdownElements = document.querySelectorAll('.countdown-timer');
    countdownElements.forEach(timer => {
        const saleEndDate = new Date(timer.dataset.saleEnd).getTime();

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = saleEndDate - now;

            if (distance < 0) {
                clearInterval(interval);
                timer.innerHTML = "Sale has ended";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            timer.innerHTML = `<span>${days}d</span> <span>${hours}h</span> <span>${minutes}m</span> <span>${seconds}s</span>`;
        }, 1000);
    });

    // --- 5. Checklist Display Logic (Individual Service Page) ---
    if (window.location.pathname.match(/^\/services\//)) {
        const pathParts = window.location.pathname.split('/');
        const serviceId = pathParts[2];

        if(serviceId && !pathParts.includes('edit')) { 
            fetch(`/api/services/${serviceId}/checklists`)
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('service-checklists');
                    if (!container) return;

                    const checklists = (data && data.checklists) ? data.checklists : [];

                    if (checklists.length === 0) {
                        container.innerHTML = ''; 
                        return;
                    }

                    container.innerHTML = `<h3 class="mt-5 section-title">Completed Pre-Departure Checklists</h3>`;

                    checklists.forEach((checklist, idx) => {
                        const doc = document.createElement('div');
                        doc.className = 'a4-document-container';

                        const getSimple = (key) => (checklist.formData && checklist.formData[key]) ? checklist.formData[key] : '';
                        const getStatus = (key) => (checklist.formData && checklist.formData[key] && checklist.formData[key].Status) ? checklist.formData[key].Status : 'N/A';
                        const getArr = (key) => (checklist.formData && checklist.formData[key] && checklist.formData[key].Arr) ? checklist.formData[key].Arr : '-';

                        doc.innerHTML = `
                            <div class="a4-header">
                                <div class="d-flex justify-content-between align-items-center">
                                     <div>
                                        <h4>Daily Fleet Pre-Departure Checklist</h4>
                                        <p>Submission #: <strong>${idx + 1}</strong></p>
                                     </div>
                                     <a href="/bookings/${checklist.booking}/checklist/download" class="btn btn-secondary btn-sm" target="_blank">Download PDF</a>
                                </div>
                            </div>
                            <div class="a4-info-grid">
                                <div><strong>Date:</strong> ${getSimple('date') || '-'}</div>
                                <div><strong>Registration:</strong> ${getSimple('registrationNo') || '-'}</div>
                                <div><strong>Department:</strong> ${getSimple('department') || '-'}</div>
                                <div><strong>Shift:</strong> ${getSimple('shift') || '-'}</div>
                                <div><strong>Route:</strong> ${getSimple('route') || '-'}</div>
                                <div><strong>Odometer:</strong> ${getSimple('odometerReading') || '-'} km</div>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered">
                                    <thead class="table-light">
                                        <tr><th>Item</th><th>Status</th><th>Arrival Time</th></tr>
                                    </thead>
                                    <tbody>
                                        ${[
                                            ['Brake Fluid', 'Brake_Fluid'], ['Window Washer Fluid', 'Window_Washer_Fluid'],
                                            ['Door Handles', 'Door_Handles'], ['License valid', 'License_valid'],
                                            ['Branding Intact', 'Branding_Intact'], ['Lights - Brake Lights', 'Lights_Brake_Lights'],
                                            ['Lights - Brights / Dimmed', 'Lights_Brights_Dimmed'], ['Lights - Indicators', 'Lights_Indicators'], ['Lights - Reverse Lights', 'Lights_Reverse_Lights'], ['Lights - Room lights', 'Lights_Room_lights_Ext'],
                                            ['Fog light', 'Fog_light'], ['Oil Leaks', 'Oil_Leaks'], ['Oil Level', 'Oil_Level'], ['Spare Wheel', 'Spare_Wheel'],
                                            ['Tire Tread', 'Tire_Tread'], ['Power steering fluid', 'Power_steering_fluid'], ['Water Leaks', 'Water_Leaks'], ['Wheel Nuts', 'Wheel_Nuts'],
                                            ['Windows', 'Windows'], ['Wiper Blades', 'Wiper_Blades'], ['Triangles', 'Triangles'], ['Jack', 'Jack'], ['Reflective Jacket', 'Reflective_Jacket']
                                        ].map(([label, key]) => `
                                            <tr>
                                                <td>${label}</td>
                                                <td>${getStatus(key)}</td>
                                                <td>${getArr(key)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="remarks-section mt-3">
                                <p><strong>REPAIRS OR REMARKS DURING SHIFT</strong></p>
                                <p>${(checklist.formData && checklist.formData.remarks) ? checklist.formData.remarks : ''}</p>
                            </div>
                        `;

                        container.appendChild(doc);
                    });
                })
                .catch(err => {
                    console.error('Failed to fetch checklists:', err);
                });
        }
    }

    // --- 6. Checklist Display Logic (Main Transportation Page) ---
    if (window.location.pathname === '/transportation') {
        const displayContainer = document.getElementById('transportation-checklists-display');
        const serviceCards = document.querySelectorAll('[data-service-id]');

        if (displayContainer && serviceCards.length > 0) {
            const serviceInfo = Array.from(serviceCards).map(card => ({
                id: card.dataset.serviceId,
                title: card.dataset.serviceTitle
            }));

            Promise.all(serviceInfo.map(async info => {
                try {
                    const res = await fetch(`/api/services/${info.id}/checklists`);
                    if (!res.ok) return { checklists: [], serviceTitle: info.title };
                    const data = await res.json();
                    return { ...(data || { checklists: [] }), serviceTitle: info.title };
                } catch (err) {
                    console.error('Error fetching checklists for service', info.id, err);
                    return { checklists: [], serviceTitle: info.title };
                }
            })).then(results => {
                const allChecklists = results.flatMap(result => (result.checklists || []).map(checklist => ({ ...checklist, serviceTitle: result.serviceTitle })));

                if (allChecklists.length === 0) {
                    displayContainer.innerHTML = '';
                    return;
                }

                displayContainer.innerHTML = `<h2 class="text-center section-title">Recent Pre-Departure Checklists</h2>`;

                allChecklists.forEach(checklist => {
                    const doc = document.createElement('div');
                    doc.className = 'a4-document-container';

                    const getData = (key) => (checklist.formData && checklist.formData[key]) ? checklist.formData[key] : 'N/A';
                    const getStatus = (key) => (checklist.formData && checklist.formData[key] && checklist.formData[key].Status) ? checklist.formData[key].Status : 'N/A';

                    doc.innerHTML = `
                        <div class="a4-header">
                            <div class="d-flex justify-content-between align-items-center">
                                 <div>
                                    <h4>Daily Fleet Pre-Departure Checklist</h4>
                                    <p>Vehicle: <strong>${checklist.serviceTitle}</strong></p>
                                 </div>
                                 <a href="/bookings/${checklist.booking}/checklist/download" class="btn btn-secondary btn-sm" target="_blank">View Full PDF</a>
                            </div>
                        </div>
                        <div class="a4-info-grid">
                            <div><strong>Date:</strong> ${getData('date')}</div>
                            <div><strong>Registration:</strong> ${getData('registrationNo')}</div>
                            <div><strong>Department:</strong> ${getData('department')}</div>
                            <div><strong>Shift:</strong> ${getData('shift')}</div>
                            <div><strong>Route:</strong> ${getData('route')}</div>
                            <div><strong>Odometer:</strong> ${getData('odometerReading')} km</div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered">
                                <thead class="table-light">
                                    <tr><th>Item</th><th>Status</th><th>Item</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>Brake Fluid</td><td>${getStatus('Brake_Fluid')}</td><td>Camera working</td><td>${getStatus('Camera_working')}</td></tr>
                                    <tr><td>Wiper Blades</td><td>${getStatus('Wiper_Blades')}</td><td>Service brake</td><td>${getStatus('Service_brake')}</td></tr>
                                    <tr><td>Oil Level</td><td>${getStatus('Oil_Level')}</td><td>Warning Lights</td><td>${getStatus('Warning_Lights')}</td></tr>
                                    <tr><td>Tire Tread</td><td>${getStatus('Tire_Tread')}</td><td>Heat Guage</td><td>${getStatus('Heat_Guage')}</td></tr>
                                    <tr><td>Wheel Nuts</td><td>${getStatus('Wheel_Nuts')}</td><td>Seats & Seat Belts</td><td>${getStatus('Seats_Seat_Belts')}</td></tr>
                                    <tr><td>Lights - Brake Lights</td><td>${getStatus('Lights_Brake_Lights')}</td><td>Fuel level (%)</td><td>${getStatus('Fuel_level')}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                    displayContainer.appendChild(doc);
                });
            }).catch(err => {
                console.error('Failed to fetch some checklists:', err);
            });
        }
    }

    // --- 7. Dropdown Logic (Desktop/Mobile Fixes) ---
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const dropdownMenu = toggle.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                dropdownMenu.classList.toggle('show');
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.href) {
                window.location.href = item.href;
            }
        });
    });

    // --- 8. Admin Geolocation Logic (Safe Check) ---
    const geoBtn = document.getElementById('btn-geo-locate');
    const geoInput = document.getElementById('contact_map_query');
    
    if (geoBtn && geoInput) {
        geoBtn.addEventListener('click', function() {
            if (navigator.geolocation) {
                geoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
                navigator.geolocation.getCurrentPosition(function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    geoInput.value = `${lat}, ${lng}`;
                    geoBtn.innerHTML = '<i class="fas fa-check"></i> Found';
                    setTimeout(() => geoBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Use Current Location', 2000);
                }, function(error) {
                    alert('Error getting location: ' + error.message);
                    geoBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Use Current Location';
                });
            } else {
                alert('Geolocation is not supported by this browser.');
            }
        });
    }
});