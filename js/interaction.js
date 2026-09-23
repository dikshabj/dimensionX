// Global state for tool interactions
window.isStethoscopeEquipped = false;

AFRAME.registerComponent('patient-interaction', {
  init: function () {
    let el = this.el;
    let feedbackText = document.querySelector('#feedback-text');
    
    el.addEventListener('click', function () {
      if (window.isStethoscopeEquipped) {
          // If the user has picked up the stethoscope
          feedbackText.setAttribute('value', "STETHOSCOPE ACTIVE\n\nHeartbeat: 78 BPM (Regular)\nLungs: Clear, no wheezing.");
          feedbackText.setAttribute('color', '#00E676'); // Green success
      } else {
          // Normal visual check
          feedbackText.setAttribute('value', "Visual Inspection:\nPatient appears stable.\n(Pick up Stethoscope to check vitals)");
          feedbackText.setAttribute('color', '#FFCA28'); // Yellow warning
      }
      
      el.setAttribute('animation', 'property: scale; to: 1.05 1.05 1.05; dir: alternate; dur: 200; loop: 1');
      setTimeout(() => {
          el.removeAttribute('animation');
      }, 400);
    });
    
    el.addEventListener('mouseenter', function () {
      el.setAttribute('color', '#81C784');
      if (window.isStethoscopeEquipped) {
          feedbackText.setAttribute('value', 'Examine Patient\n(Use Stethoscope)');
          feedbackText.setAttribute('color', '#00E676');
      } else {
          feedbackText.setAttribute('value', 'Examine Patient\n(Visual Check)');
          feedbackText.setAttribute('color', '#FFFFFF');
      }
    });
    
    el.addEventListener('mouseleave', function () {
      el.setAttribute('color', '#43A047');
      feedbackText.setAttribute('value', 'SYSTEM READY\nSelect an object to interact.');
      feedbackText.setAttribute('color', '#FFFFFF');
    });
  }
});

// Component to pick up and inspect medical equipment
AFRAME.registerComponent('inspectable', {
  schema: {
    infoText: {type: 'string', default: 'Medical Equipment'},
    isTool: {type: 'boolean', default: false} // E.g. Stethoscope
  },
  init: function () {
    let el = this.el;
    let feedbackText = document.querySelector('#feedback-text');
    this.isInspecting = false;
    this.originalPosition = el.getAttribute('position');
    this.originalRotation = el.getAttribute('rotation');
    
    el.addEventListener('click', (evt) => {
      evt.stopPropagation();
      
      let camera = document.querySelector('#camera');
      let scene = document.querySelector('a-scene');
      
      if (!this.isInspecting) {
        // Pick it up
        this.isInspecting = true;
        if (this.data.isTool) window.isStethoscopeEquipped = true;
        
        // Remove from current parent and attach to camera (visible on screen)
        el.parentNode.removeChild(el);
        camera.appendChild(el);
        
        // Position it clearly in front of the camera, slightly right
        el.setAttribute('position', '0.15 -0.15 -0.4'); 
        el.setAttribute('rotation', '0 0 0');
        
        // Update UI
        if (this.data.isTool) {
            feedbackText.setAttribute('value', this.data.infoText + "\n(Click PATIENT to use, click elsewhere to drop)");
        } else {
            feedbackText.setAttribute('value', this.data.infoText + "\n(Click anywhere else to put down)");
        }
        feedbackText.setAttribute('color', '#64B5F6');

        // Add a listener to the scene to drop it
        setTimeout(() => {
          this.dropHandler = (e) => {
            // If they clicked any part of the patient bed, let the patient interaction happen, don't drop it yet.
            if (e.target && e.target.closest && e.target.closest('[patient-interaction]')) {
                return;
            }

            this.isInspecting = false;
            if (this.data.isTool) window.isStethoscopeEquipped = false;
            
            // Put it back to its original parent table
            el.parentNode.removeChild(el);
            let table = document.querySelector('#equipment-table');
            
            if(table && (this.data.infoText.includes("Clipboard") || this.data.infoText.includes("Syringe") || this.data.infoText.includes("Amoxicillin") || this.data.isTool)) {
                table.appendChild(el);
            } else {
                scene.appendChild(el);
            }
            
            el.setAttribute('position', this.originalPosition);
            el.setAttribute('rotation', this.originalRotation);
            
            feedbackText.setAttribute('value', 'Item returned to table.');
            feedbackText.setAttribute('color', '#FFFFFF');
            
            scene.removeEventListener('click', this.dropHandler);
          };
          scene.addEventListener('click', this.dropHandler);
        }, 100);
      }
    });

    el.addEventListener('mouseenter', () => {
      if (!this.isInspecting) {
        feedbackText.setAttribute('value', 'Grab:\n' + this.data.infoText.split('\n')[0]);
        feedbackText.setAttribute('color', '#FFD54F');
      }
    });
    
    el.addEventListener('mouseleave', () => {
      if (!this.isInspecting) {
        feedbackText.setAttribute('value', 'SYSTEM READY\nSelect an object to interact.');
        feedbackText.setAttribute('color', '#FFFFFF');
      }
    });
  }
});
