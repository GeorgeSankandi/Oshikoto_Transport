document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Chatbot State Persistence (Unchanged) ---
    const savedChatHistory = sessionStorage.getItem('chatHistory');
    const chatWindow = document.getElementById('chat-window');
    const chatBody = document.getElementById('chat-body');
    if (savedChatHistory && chatWindow && chatBody) {
        chatBody.innerHTML = savedChatHistory;
        chatWindow.style.display = 'flex';
        setTimeout(() => {
            chatWindow.classList.remove('hidden');
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 10);
        sessionStorage.removeItem('chatHistory');
    }

    // --- 2. DOM Persistence (Unchanged) ---
    const sidebarScroll = localStorage.getItem('sidebarScroll');
    if (sidebarScroll) {
        window.scrollTo(0, parseInt(sidebarScroll));
    }
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('sidebarScroll', window.scrollY);
    });

    var activeTab = localStorage.getItem('activeTab');
    if (activeTab) {
        var tabTrigger = document.querySelector(`button[data-bs-target="${activeTab}"]`);
        if (tabTrigger) {
            var tab = new bootstrap.Tab(tabTrigger);
            tab.show();
        }
    }

    var tabLinks = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabLinks.forEach(function(tabLink) {
        tabLink.addEventListener('shown.bs.tab', function(event) {
            var target = event.target.getAttribute('data-bs-target');
            localStorage.setItem('activeTab', target);
        });
    });

    // --- 3. Chatbot Logic (Unchanged) ---
    const chatIcon = document.getElementById('chat-icon');
    const closeChat = document.getElementById('close-chat');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    if (chatIcon) {
        chatIcon.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (chatWindow.classList.contains('hidden')) {
                chatWindow.style.display = 'flex'; 
                setTimeout(() => { chatWindow.classList.remove('hidden'); }, 10);
            } else {
                chatWindow.classList.add('hidden');
                setTimeout(() => { chatWindow.style.display = 'none'; }, 300); 
            }
        });

        closeChat.addEventListener('click', (e) => {
            e.stopPropagation();
            chatWindow.classList.add('hidden');
            setTimeout(() => { chatWindow.style.display = 'none'; }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!chatWindow.classList.contains('hidden') && 
                !chatWindow.contains(e.target) && 
                !chatIcon.contains(e.target)) {
                chatWindow.classList.add('hidden');
                setTimeout(() => { chatWindow.style.display = 'none'; }, 300);
            }
        });

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userMessage = chatInput.value.trim();
            if (!userMessage) return;
            appendMessage(userMessage, 'sent');
            chatInput.value = '';
            const typingIndicator = appendMessage('...', 'received', true);

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: userMessage }),
                });
                if (!res.ok) throw new Error('Network response was not ok');
                const data = await res.json();
                let replyText = data.reply;
                let navigateUrl = null;

                if (replyText.includes('||NAVIGATE:')) {
                    const parts = replyText.split('||NAVIGATE:');
                    replyText = parts[0].trim();
                    const urlPart = parts[1].split('||')[0];
                    navigateUrl = urlPart.trim();
                }
                
                typingIndicator.remove();
                appendMessage(replyText, 'received');

                if (navigateUrl) {
                    const navMsg = document.createElement('div');
                    navMsg.classList.add('message', 'received');
                    navMsg.innerHTML = `<p class="fst-italic text-muted"><i class="fas fa-spinner fa-spin me-1"></i> Opening page...</p>`;
                    chatBody.appendChild(navMsg);
                    chatBody.scrollTop = chatBody.scrollHeight;
                    sessionStorage.setItem('chatHistory', chatBody.innerHTML);
                    setTimeout(() => { window.location.href = navigateUrl; }, 1000);
                }
            } catch (error) {
                typingIndicator.remove();
                appendMessage('Sorry, I seem to be having trouble right now. Please try again later.', 'received');
            }
        });

        function appendMessage(text, type, isTyping = false) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', type);
            const p = document.createElement('p');
            p.innerText = text; 
            if(isTyping) p.classList.add('typing');
            messageDiv.appendChild(p);
            chatBody.appendChild(messageDiv);
            chatBody.scrollTop = chatBody.scrollHeight;
            return messageDiv;
        }
    }

    // --- 4. Live Sale Timer Logic (Unchanged) ---
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

    // --- 5. Checklist Display Logic (MODIFIED FOR SINGLE USER CHECKLIST) ---
    if (window.location.pathname.match(/^\/services\//)) {
        const pathParts = window.location.pathname.split('/');
        const serviceId = pathParts[2];

        if(serviceId && !pathParts.includes('edit')) { 
            fetch(`/api/services/${serviceId}/checklists`)
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('service-checklists');
                    if (!container) return;

                    // MODIFIED: API now returns a single { checklist: Obj } or { checklist: null }
                    const checklist = data.checklist;

                    if (!checklist) {
                        // If no checklist found for this user, display nothing or a gentle message
                        container.innerHTML = ''; 
                        return;
                    }

                    container.innerHTML = `<h3 class="mt-5 section-title text-center">My Latest Pre-Departure Checklist</h3>`;

                    // Helper to generate status badges
                    const getBadge = (formData, key) => {
                        const item = formData[key];
                        const status = item ? (item.Status || item) : 'N/A';
                        
                        let badgeClass = 'bg-secondary';
                        if (status === 'OK' || status === 'Y') badgeClass = 'bg-success';
                        else if (status === 'DEF' || status === 'N') badgeClass = 'bg-danger';
                        
                        return `<span class="badge ${badgeClass}">${status}</span>`;
                    };

                    const getText = (formData, key) => {
                        return formData[key] || '-';
                    };

                    // MODIFIED: No forEach loop. Render single checklist.
                    const doc = document.createElement('div');
                    const d = checklist.formData || {};
                    const dateStr = getText(d, 'date') || 'undated';
                    const regStr = getText(d, 'registrationNo') || 'checklist';
                    const filename = `Checklist_${dateStr}_${regStr}.pdf`;
                    
                    doc.className = 'a4-document-container mx-auto mb-5';
                    doc.style.maxWidth = '900px';
                    doc.style.border = '1px solid #dee2e6';
                    doc.style.padding = '20px';
                    doc.style.backgroundColor = 'white';

                    doc.innerHTML = `
                        <!-- HEADER -->
                        <header class="header-grid" style="display: grid; grid-template-columns: 2fr 1fr 1fr; margin-bottom: 10px; border: 1px solid black; font-size: 12px;">
                            <div class="header-col-1 p-2 border-end" style="border-right: 1px solid black;">
                                <p class="mb-0"><strong>Company:</strong> Oshikoto Transport & Investment CC</p>
                                <p class="mb-0"><strong>Doc Type:</strong> HSE Checklist</p>
                            </div>
                            <div class="header-col-2 p-2 border-end" style="border-right: 1px solid black;">
                                <p class="mb-0"><strong>Ref No:</strong> C002</p>
                                <p class="mb-0"><strong>Rev:</strong> 01</p>
                            </div>
                            <div class="header-col-3 p-2 text-center">
                                <img src="/images/companylogo.png" alt="Logo" style="max-height: 40px;">
                            </div>
                        </header>

                        <h1 class="text-center p-2 border border-bottom-0 mb-0 bg-light fw-bold h5" style="border: 1px solid black; background-color: #e0e0e0;">Daily Fleet Pre-Departure Checklist</h1>

                        <!-- TOP INFO SECTION -->
                        <div class="info-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid black; margin-bottom: 10px; font-size: 12px;">
                            <div class="info-cell p-1 border-end border-bottom" style="border-right: 1px solid black; border-bottom: 1px solid black;"><strong>Date</strong><br>${getText(d, 'date')}</div>
                            <div class="info-cell p-1 border-end border-bottom" style="border-right: 1px solid black; border-bottom: 1px solid black;"><strong>Dept/Branch</strong><br>${getText(d, 'department')}</div>
                            <div class="info-cell p-1 border-end border-bottom" style="border-right: 1px solid black; border-bottom: 1px solid black;"><strong>Reg No</strong><br>${getText(d, 'registrationNo')}</div>
                            <div class="info-cell p-1 border-bottom" style="border-bottom: 1px solid black;"><strong>Odometer</strong><br>${getText(d, 'odometerReading')}</div>
                            
                            <div class="info-cell p-1 border-end border-bottom" style="border-right: 1px solid black; border-bottom: 1px solid black;"><strong>Route</strong><br>${getText(d, 'route')}</div>
                            <div class="info-cell p-1 border-end border-bottom" style="border-right: 1px solid black; border-bottom: 1px solid black;"><strong>Seats</strong><br>${getText(d, 'seatsOccupied')}</div>
                            <div class="info-cell p-1 border-end border-bottom" style="border-right: 1px solid black; border-bottom: 1px solid black;"><strong>To Site</strong><br>${getText(d, 'toSite')}</div>
                            <div class="info-cell p-1 border-bottom" style="border-bottom: 1px solid black;"><strong>Return</strong><br>${getText(d, 'return')}</div>
                            
                            <div class="info-cell p-1" style="grid-column: span 4;">
                                <strong>Shift: </strong> <span class="badge bg-primary">${getText(d, 'shift')}</span>
                            </div>
                        </div>
                        
                        <!-- CHECKLIST TABLES -->
                        <div class="row">
                            <!-- Left Column -->
                            <div class="col-md-6">
                                <table class="checklist-table w-100" style="font-size: 12px; table-layout: fixed; border-collapse: collapse; border: 1px solid black;">
                                    <thead>
                                        <tr style="background: #f8f9fa;">
                                            <th class="p-1 border" style="width: 70%;">External Item</th>
                                            <th class="p-1 border text-center" style="width: 15%;">Class</th>
                                            <th class="p-1 border text-center" style="width: 15%;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Brake Fluid</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Brake_Fluid')}</td></tr>
                                        <tr><td class="p-1 border">Window Washer Fluid</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Window_Washer_Fluid')}</td></tr>
                                        <tr><td class="p-1 border">Door Handles</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Door_Handles')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">License valid</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'License_valid')}</td></tr>
                                        <tr><td class="p-1 border">Branding Intact</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Branding_Intact')}</td></tr>
                                        <tr><td class="p-1 border">Lights - Brake Lights</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Lights_Brake_Lights')}</td></tr>
                                        <tr><td class="p-1 border" style="padding-left: 20px;">- Brights / Dimmed</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Lights_Brights_Dimmed')}</td></tr>
                                        <tr><td class="p-1 border" style="padding-left: 20px;">- Indicators</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Lights_Indicators')}</td></tr>
                                        <tr><td class="p-1 border" style="padding-left: 20px;">- Reverse Lights</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Lights_Reverse_Lights')}</td></tr>
                                        <tr><td class="p-1 border" style="padding-left: 20px;">- Room lights</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Lights_Room_lights_Ext')}</td></tr>
                                        <tr><td class="p-1 border" style="padding-left: 20px;">- Fog light</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Fog_light')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Oil Leaks</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Oil_Leaks')}</td></tr>
                                        <tr><td class="p-1 border">Oil Level</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Oil_Level')}</td></tr>
                                        <tr><td class="p-1 border">Spare Wheel</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Spare_Wheel')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Tire Tread</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Tire_Tread')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Power steering fluid</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Power_steering_fluid')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Water Leaks</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Water_Leaks')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Wheel Nuts</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Wheel_Nuts')}</td></tr>
                                        <tr><td class="p-1 border">Windows</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Windows')}</td></tr>
                                        <tr><td class="p-1 border">Wiper Blades</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Wiper_Blades')}</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Right Column -->
                            <div class="col-md-6">
                                <table class="checklist-table w-100" style="font-size: 12px; table-layout: fixed; border-collapse: collapse; border: 1px solid black;">
                                    <thead>
                                        <tr style="background: #f8f9fa;">
                                            <th class="p-1 border" style="width: 70%;">Item</th>
                                            <th class="p-1 border text-center" style="width: 15%;">Class</th>
                                            <th class="p-1 border text-center" style="width: 15%;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td class="p-1 border">Camera working</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Camera_working')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Service brake</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Service_brake')}</td></tr>
                                        <tr><td class="p-1 border">Toolbox</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Toolbox')}</td></tr>
                                        <tr><td class="p-1 border">Spare spanners</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Spare_spanners')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Wheel spanner</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Wheel_spanner')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">100 km sticker</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, '100_km_sticker')}</td></tr>
                                        <tr><td class="p-1 border">Log book (MDC)</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Log_book')}</td></tr>
                                        <tr><td class="p-1 border">Air leaks</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Air_leaks')}</td></tr>
                                        <tr><td class="p-1 border">Stop blocks</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Stop_blocks')}</td></tr>
                                        <tr><td class="p-1 border">Fleet numbers</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Fleet_numbers')}</td></tr>
                                        <tr><td class="p-1 border">Valid public permit</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Valid_public_permit')}</td></tr>
                                        <tr><td class="p-1 border">Revers hooter</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Revers_hooter')}</td></tr>
                                        <tr><td class="p-1 border">Reflector strips</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Reflector_strips')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Park brake</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Park_brake')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Emergency brake</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Emergency_brake')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Diesel leaks</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Diesel_leaks')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Exhaust leaks</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Exhaust_leaks')}</td></tr>
                                        <tr><td class="p-1 border">Triangles (x2)</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Triangles')}</td></tr>
                                        <tr><td class="p-1 border">Jack</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Jack')}</td></tr>
                                        <tr><td class="p-1 border">Reflective Jacket</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Reflective_Jacket')}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Page Break for PDF continuity visual (Screen) and Page Break (PDF) -->
                        <div style="border-bottom: 1px dashed #ccc; margin: 20px 0; page-break-before: always;"></div>

                        <!-- INTERNAL CHECKS (Page 2 content in template) -->
                        <div class="row">
                            <div class="col-12">
                                <table class="checklist-table w-100" style="font-size: 12px; table-layout: fixed; border-collapse: collapse; border: 1px solid black;">
                                    <thead>
                                        <tr style="background: #f8f9fa;">
                                            <th class="p-1 border" style="width: 70%;">Item</th>
                                            <th class="p-1 border text-center" style="width: 15%;">Class</th>
                                            <th class="p-1 border text-center" style="width: 15%;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr class="bg-light"><td colspan="3" class="p-1 border fw-bold text-center">Internal Checks</td></tr>
                                        <tr><td class="p-1 border">Warning Lights</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Warning_Lights')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Heat Guage</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Heat_Guage')}</td></tr>
                                        <tr><td class="p-1 border">Hooter</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Hooter')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Seats & Seat Belts</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Seats_Seat_Belts')}</td></tr>
                                        <tr><td class="p-1 border">Mirrors (rear & side)</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Mirrors')}</td></tr>
                                        <tr><td class="p-1 border">Room Lights</td><td class="p-1 border text-center">B</td><td class="p-1 border text-center">${getBadge(d, 'Room_Lights_Int')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Fuel level (%)</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Fuel_level')}</td></tr>
                                        <tr><td class="p-1 border class-a" style="color: #dc3545; font-weight: bold;">Fuel tag</td><td class="p-1 border text-center class-a" style="color: #dc3545; font-weight: bold;">A</td><td class="p-1 border text-center">${getBadge(d, 'Fuel_tag')}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- OTHER SECTION -->
                        <div class="row mt-2">
                            <div class="col-12">
                                <table class="w-100 border bg-light" style="border: 1px solid black; font-size: 12px;">
                                    <tr>
                                        <td class="p-2 border" style="border: 1px solid black;">Fire Extinguisher available?</td>
                                        <td class="p-2 border text-center" style="width: 50px; border: 1px solid black;">B</td>
                                        <td class="p-2 border text-center" style="width: 100px; border: 1px solid black;">${getBadge(d, 'Fire_Extinguisher')}</td>
                                    </tr>
                                    <tr>
                                        <td class="p-2 border" style="border: 1px solid black;">First aid kit available?</td>
                                        <td class="p-2 border text-center" style="border: 1px solid black;">B</td>
                                        <td class="p-2 border text-center" style="border: 1px solid black;">${getBadge(d, 'First_Aid_Kit')}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <!-- REMARKS SECTION -->
                        <div class="row mt-2">
                            <div class="col-12">
                                <div class="border p-2" style="min-height: 80px; background: #fff; border: 1px solid black;">
                                    <p class="mb-1 fw-bold" style="font-size: 12px;">REPAIRS OR REMARKS DURING SHIFT:</p>
                                    <p class="mb-0 text-muted fst-italic" style="font-size: 12px;">${getText(d, 'remarks')}</p>
                                </div>
                            </div>
                        </div>

                        <!-- SIGNATURE SECTION -->
                        <div class="row mt-3">
                            <div class="col-12">
                                <table class="w-100 border" style="border: 1px solid black; font-size: 12px;">
                                    <tr>
                                        <td class="p-2 border-end border-bottom" style="width: 50%; border-right: 1px solid black; border-bottom: 1px solid black;">
                                            <strong>DRIVER NAME:</strong><br>${getText(d, 'driverName')}
                                        </td>
                                        <td class="p-2 border-bottom" style="width: 50%; border-bottom: 1px solid black;">
                                            <strong>DRIVERS SIGNATURE:</strong><br>${getText(d, 'driverSignature')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="p-2 border-end" style="border-right: 1px solid black;">
                                            <strong>SUPERVISOR NAME:</strong><br>${getText(d, 'supervisorName')}
                                        </td>
                                        <td class="p-2">
                                            <strong>SUPERVISOR SIGNATURE:</strong><br>${getText(d, 'supervisorSignature')}
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        
                        <div class="text-end mt-3 no-print" data-html2canvas-ignore="true">
                            <button class="btn btn-outline-danger download-pdf-btn" data-filename="${filename}">
                                <i class="fas fa-file-pdf me-2"></i>Download as PDF
                            </button>
                        </div>
                    `;

                    container.appendChild(doc);
                })
                .catch(err => {
                    console.error('Failed to fetch checklists:', err);
                });
        }
    }

    // --- 6. Client-Side PDF Generation (Updated for html2pdf) ---
    document.addEventListener('click', function(e) {
        if (e.target.closest('.download-pdf-btn')) {
            const btn = e.target.closest('.download-pdf-btn');
            const content = btn.closest('.a4-document-container'); // The specific card
            const filename = btn.dataset.filename || 'Checklist.pdf';
            
            // Options for html2pdf
            const opt = {
                margin: 0.2, // Small margin
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            // Visual feedback
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
            btn.disabled = true;

            // Generate PDF
            if (typeof html2pdf === 'function') {
                html2pdf().from(content).set(opt).save().finally(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                });
            } else {
                alert('PDF generator library (html2pdf) not loaded. Please refresh the page.');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    });

    // --- 7. Admin Geolocation Logic (Unchanged) ---
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