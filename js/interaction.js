// Global state for tool interactions
window.isStethoscopeEquipped = false;
window.heldItemEntity = null;

AFRAME.registerComponent('patient-interaction', {
  init: function () {
    let el = this.el;
    let feedbackText = document.querySelector('#feedback-text');
    
    el.addEventListener('click', function () {
      if (window.isStethoscopeEquipped) {
          // Create floating popup at patient's location
          let popup = document.createElement('a-entity');
          popup.setAttribute('position', '0 1.5 0'); // Above patient
          
          let bg = document.createElement('a-plane');
          bg.setAttribute('width', '1.8');
          bg.setAttribute('height', '0.7');
          bg.setAttribute('color', '#00E676');
          bg.setAttribute('material', 'shader: flat; opacity: 0.9');
          popup.appendChild(bg);
          
          let text = document.createElement('a-text');
          text.setAttribute('value', "Heartbeat: 78 BPM\nLungs: Clear\n(Status: Normal)");
          text.setAttribute('align', 'center');
          text.setAttribute('position', '0 0 0.02');
          text.setAttribute('color', '#000000');
          text.setAttribute('scale', '0.6 0.6 0.6');
          popup.appendChild(text);
          
          // Animation: float up and fade out
          popup.setAttribute('animation__pos', 'property: position; to: 0 2.2 0; dur: 3500; easing: easeOutCubic');
          bg.setAttribute('animation__fade', 'property: material.opacity; to: 0; dur: 3500; easing: easeOutCubic');
          text.setAttribute('animation__fade', 'property: opacity; to: 0; dur: 3500; easing: easeOutCubic'); // For text component it's just opacity
          
          // Face the user (Bed is rotated 90 on Y, so local 0 0 0 faces world +X where user is)
          popup.setAttribute('rotation', '0 0 0');
          
          el.appendChild(popup);
          
          // Remove popup after animation finishes
          setTimeout(() => {
              if (el.contains(popup)) {
                  el.removeChild(popup);
              }
          }, 3500);

          feedbackText.setAttribute('value', "STETHOSCOPE ACTIVE\n\nPatient Vitals Checked.");
          feedbackText.setAttribute('color', '#00E676'); 
      } else {
          // Normal visual check
          feedbackText.setAttribute('value', "Visual Inspection:\nPatient appears stable.\n(Pick up Stethoscope to check vitals)");
          feedbackText.setAttribute('color', '#FFCA28'); 
      }
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

// Component to pick up and inspect medical equipment with Floating Buttons
AFRAME.registerComponent('pickup-logic', {
  schema: {
    infoText: {type: 'string', default: 'Item'},
    isTool: {type: 'boolean', default: false}
  },
  init: function () {
    let el = this.el;
    
    // Fix for A-Frame reparenting bug: if already initialized, just restore references
    if (el.pickupStateInitialized) {
        this.floatingBtn = el.querySelector('.floating-btn');
        this.btnText = el.querySelector('.floating-text');
        this.bg = el.querySelector('.floating-bg');
        this.originalPosition = el.getAttribute('data-pos');
        this.originalRotation = el.getAttribute('data-rot');
        this.isHeld = el.getAttribute('data-held') === 'true';
        return;
    }
    
    el.pickupStateInitialized = true;
    
    // Save original position as string attributes
    this.originalPosition = AFRAME.utils.coordinates.stringify(el.getAttribute('position'));
    this.originalRotation = AFRAME.utils.coordinates.stringify(el.getAttribute('rotation'));
    el.setAttribute('data-pos', this.originalPosition);
    el.setAttribute('data-rot', this.originalRotation);
    el.setAttribute('data-held', 'false');
    this.isHeld = false;
    
    // Create the floating button programmatically
    this.floatingBtn = document.createElement('a-entity');
    this.floatingBtn.classList.add('floating-btn');
    this.floatingBtn.setAttribute('position', '0 0.25 0'); 
    this.floatingBtn.setAttribute('animation', 'property: position; dir: alternate; dur: 800; easing: easeInOutSine; loop: true; to: 0 0.3 0');
    this.floatingBtn.setAttribute('visible', 'false');
    
    this.bg = document.createElement('a-plane');
    this.bg.classList.add('floating-bg');
    this.bg.setAttribute('width', '0.7');
    this.bg.setAttribute('height', '0.2');
    this.bg.setAttribute('color', '#00E676');
    this.bg.setAttribute('material', 'shader: flat');
    this.floatingBtn.appendChild(this.bg);
    
    this.btnText = document.createElement('a-text');
    this.btnText.classList.add('floating-text');
    this.btnText.setAttribute('value', 'PICK UP');
    this.btnText.setAttribute('align', 'center');
    this.btnText.setAttribute('position', '0 0 0.01');
    this.btnText.setAttribute('scale', '0.5 0.5 0.5');
    this.btnText.setAttribute('color', '#000000');
    this.floatingBtn.appendChild(this.btnText);
    
    el.appendChild(this.floatingBtn);
    
    el.addEventListener('mouseenter', () => {
        if (this.isHeld) return; // Don't show if already holding this item

        let feedbackText = document.querySelector('#feedback-text');
        feedbackText.setAttribute('value', this.data.infoText);

        this.floatingBtn.setAttribute('visible', 'true');
        
        if (window.heldItemEntity) {
            this.bg.setAttribute('color', '#FFCA28');
            this.btnText.setAttribute('value', 'SWAP ITEM');
        } else {
            this.bg.setAttribute('color', '#00E676');
            this.btnText.setAttribute('value', 'PICK UP');
        }
    });

    el.addEventListener('mouseleave', () => {
        if (this.floatingBtn) this.floatingBtn.setAttribute('visible', 'false');
        
        if (!this.isHeld) {
            let feedbackText = document.querySelector('#feedback-text');
            feedbackText.setAttribute('value', 'SYSTEM READY\nSelect an object to interact.');
        }
    });

    el.addEventListener('click', () => {
        if (this.isHeld) return;
        
        // If holding something else, drop it first (SWAP)
        if (window.heldItemEntity && window.heldItemEntity !== el) {
            window.heldItemEntity.components['pickup-logic'].dropItem();
        }
        
        this.equipItem();
    });
  },
  
  equipItem: function() {
      let el = this.el;
      let camera = document.querySelector('#camera');
      
      this.isHeld = true;
      el.setAttribute('data-held', 'true');
      window.heldItemEntity = el;
      if (this.data.isTool) window.isStethoscopeEquipped = true;
      
      this.floatingBtn.setAttribute('visible', 'false');
      
      el.parentNode.removeChild(el);
      camera.appendChild(el);
      
      el.setAttribute('position', '0.15 -0.15 -0.4');
      el.setAttribute('rotation', '0 0 0');
  },
  
  dropItem: function() {
      let el = this.el;
      let table = document.querySelector('#equipment-table');
      
      this.isHeld = false;
      el.setAttribute('data-held', 'false');
      if (this.data.isTool) window.isStethoscopeEquipped = false;
      if (window.heldItemEntity === el) window.heldItemEntity = null;
      
      el.parentNode.removeChild(el);
      if (table) {
          table.appendChild(el);
      } else {
          document.querySelector('a-scene').appendChild(el);
      }
      
      el.setAttribute('position', this.originalPosition);
      el.setAttribute('rotation', this.originalRotation);
  }
});

// Drop Zone Component for the Table
AFRAME.registerComponent('drop-zone', {
  init: function () {
    let el = this.el;
    
    // Create floating drop button
    this.floatingBtn = document.createElement('a-entity');
    this.floatingBtn.setAttribute('position', '0 1.2 0'); // Above table
    this.floatingBtn.setAttribute('animation', 'property: position; dir: alternate; dur: 800; easing: easeInOutSine; loop: true; to: 0 1.3 0');
    this.floatingBtn.setAttribute('visible', 'false');
    
    let bg = document.createElement('a-plane');
    bg.setAttribute('width', '0.8');
    bg.setAttribute('height', '0.25');
    bg.setAttribute('color', '#FF5252');
    bg.setAttribute('material', 'shader: flat; opacity: 0.9');
    this.floatingBtn.appendChild(bg);
    
    let btnText = document.createElement('a-text');
    btnText.setAttribute('value', 'DROP ITEM HERE');
    btnText.setAttribute('align', 'center');
    btnText.setAttribute('position', '0 0 0.01');
    btnText.setAttribute('scale', '0.5 0.5 0.5');
    btnText.setAttribute('color', '#FFFFFF');
    this.floatingBtn.appendChild(btnText);
    
    // Ensure button always faces the user slightly
    this.floatingBtn.setAttribute('rotation', '0 -90 0');
    
    el.appendChild(this.floatingBtn);
    
    el.addEventListener('mouseenter', () => {
        if (window.heldItemEntity) {
            this.floatingBtn.setAttribute('visible', 'true');
        }
    });
    
    el.addEventListener('mouseleave', () => {
        this.floatingBtn.setAttribute('visible', 'false');
    });
    
    el.addEventListener('click', () => {
        if (window.heldItemEntity) {
            window.heldItemEntity.components['pickup-logic'].dropItem();
            this.floatingBtn.setAttribute('visible', 'false');
            
            let feedbackText = document.querySelector('#feedback-text');
            feedbackText.setAttribute('value', 'Item dropped.');
        }
    });
  }
});
