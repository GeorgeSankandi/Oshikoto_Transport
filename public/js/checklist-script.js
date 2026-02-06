document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('checklistForm');
    const dateInput = form.querySelector('input[name="date"]');
    // Get the main Department input and all the read-only reference inputs
    const mainDepartmentInput = document.getElementById('mainDepartmentInput');
    const departmentRefInputs = document.querySelectorAll('.department-ref-input');
    const messageArea = document.getElementById('message-area'); // Corrected: ensure messageArea is retrieved

    // 1. Auto-fill Date with current date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;

    // --- Department Synchronization Logic (NEW) ---
    const syncDepartmentFields = () => {
        const departmentValue = mainDepartmentInput.value;
        departmentRefInputs.forEach(input => {
            input.value = departmentValue;
        });
    };

    // Initial sync and event listener for changes
    syncDepartmentFields(); // Run once on load
    mainDepartmentInput.addEventListener('input', syncDepartmentFields);
    
    // --- State Management Constants ---
    const STATES_OK_DEF = ['OK', 'N/A', 'DEF'];
    const STATES_Y_N = ['Y', 'N/A', 'N'];
    
    // Function to update the row's visual state based on the checked radio button
    const updateVisualState = (switchContainer, checkedValue) => {
        // NEW LOOKUP: Find the notification by traversing up to the table row (<tr>) 
        // and querying the entire row for the notification span.
        const row = switchContainer.closest('tr');
        const notification = row ? row.querySelector('.unselected-notification') : null;
        
        // Update notification visibility
        if (notification) {
            // Only show notification if the N/A state is selected
            if (checkedValue === 'N/A') {
                notification.style.opacity = 1;
            } else {
                notification.style.opacity = 0;
            }
        }
    };

    // --- Switch Initialization and Logic (3-State with Dbl-Click) ---
    const toggleSwitches = document.querySelectorAll('.toggle-switch.three-state');

    toggleSwitches.forEach(switchContainer => {
        const name = switchContainer.dataset.name;
        
        // Define the state sequence for this specific switch
        const isYN = switchContainer.classList.contains('y-n-switch');
        const STATES = isYN ? STATES_Y_N : STATES_OK_DEF;

        // Get the radio inputs
        const inputs = {};
        STATES.forEach(state => {
            const input = switchContainer.querySelector(`input[name="${name}"][value="${state}"]`);
            if (input) inputs[state] = input;
        });

        // 1. Initialize Default State (Select N/A)
        let checkedInput = Object.values(inputs).find(input => input.checked);
        if (!checkedInput && inputs['N/A']) {
             inputs['N/A'].checked = true;
             checkedInput = inputs['N/A'];
        }

        // Initialize visual state
        if (checkedInput) {
            updateVisualState(switchContainer, checkedInput.value);
        }

        /*
         * 2. SINGLE Click Listener (Cycles the state)
         *    Listens on the entire switch container for accurate area detection.
         */
        switchContainer.addEventListener('click', (e) => {
            // Prevent the default radio button behavior if the click is on the slider or labels
            if (e.target.closest('.slider') || e.target.classList.contains('switch-label')) {
                e.preventDefault();
            }

            // 1. Get current state value
            let currentValue = null;
            Object.values(inputs).forEach(input => {
                if (input.checked) currentValue = input.value;
            });

            // If no value is currently checked, default to the first state
            if (!currentValue && STATES.length > 0) {
                currentValue = STATES[0];
            }

            // If still no current value, something is wrong, exit
            if (!currentValue) return; 

            // 2. Find current index and calculate next index (Cyclic Array Logic)
            const currentIndex = STATES.indexOf(currentValue);
            const nextIndex = (currentIndex + 1) % STATES.length;
            const nextStateValue = STATES[nextIndex];

            // 3. Force check the next radio button and update visual
            const nextInput = inputs[nextStateValue];
            if (nextInput) {
                nextInput.checked = true;
                updateVisualState(switchContainer, nextStateValue);
            }
        });

    });


    // 4. Handle Form Submission (Updated to handle Departure as text and skip refs)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.textContent = 'Submitting...';

        // Collect all form data
        const formData = new FormData(form);
        const data = {};
        
        // Convert FormData to a structured JSON object
        for (const [key, value] of formData.entries()) {
            
            // Skip the read-only department reference fields
            if (key.endsWith('_Dep_Ref')) {
                continue;
            }

            const parts = key.split('_');
            const suffix = parts[parts.length - 1];
            const isArr = suffix === 'Arr';
            
            // Determine the base key (e.g., "Brake_Fluid")
            const baseKey = isArr ? parts.slice(0, -1).join('_') : key;

            if (isArr) {
                // Handle Arrival Time
                data[baseKey] = data[baseKey] || {};
                data[baseKey].Arr = value;
            } else if (key.endsWith('_Dep')) {
                // This block is now unused based on the new HTML, but kept as a safeguard if another Dep field is added
                data[baseKey] = data[baseKey] || {};
                data[baseKey].Dep = value;
            } else if (STATES_OK_DEF.includes(value) || STATES_Y_N.includes(value) || key === 'shift') {
                // Handle Status (OK/DEF/Y/N/N/A) or the Shift radio selection
                data[baseKey] = data[baseKey] || {};
                
                if (baseKey !== 'shift') {
                    data[baseKey].Status = value; // Checklist items map to Status
                } else {
                    data[key] = value; // Shift selection stays at top level
                }
            } else {
                // Handle all other simple text/number inputs
                data[key] = value;
            }
        }

        console.log('Data to be sent:', data);

        // 5. Send data to Node.js server
        try {
            const response = await fetch(form.action, { // Use form's action attribute for the URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                messageArea.textContent = `Success! ${result.message}`;
                messageArea.style.color = 'green';
                 setTimeout(() => {
                    window.location.href = '/dashboard'; // Redirect back to dashboard on success
                }, 2000);
            } else {
                const result = await response.json();
                messageArea.textContent = `Error: ${result.message || 'Check server console.'}`;
                messageArea.style.color = 'red';
            }
        } catch (error) {
            console.error('Submission failed:', error);
            messageArea.textContent = 'Network error. Submission failed.';
             messageArea.style.color = 'red';
        }
    });
});