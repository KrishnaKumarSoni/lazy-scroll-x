// Add Plus Jakarta Sans font
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

let isScrolling = false;
let scrollInterval;
let autoRefreshInterval;
let scrollSpeed = 1;
let isAutoRefreshEnabled = false;
let refreshTime = 4; // minutes

let scrollAnimationFrame;
let lastScrollTime = 0;

// Create control panel
const panel = document.createElement('div');
panel.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  background: white;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  font-family: 'Plus Jakarta Sans', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

// Create scroll button
const button = document.createElement('button');
button.textContent = 'Start Auto-Scroll';
button.style.cssText = `
  padding: 8px 16px;
  background: black;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 500;
  font-size: 14px;
  transition: background 0.3s ease;
`;

// Create speed control
const speedControl = document.createElement('div');
speedControl.style.cssText = `
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;
speedControl.innerHTML = `
  <label style="color: black; font-weight: 500;">Speed:</label>
  <input type="range" min="0.05" max="20" value="1" step="0.05" style="
    flex: 1;
    accent-color: black;
  ">
  <span style="color: black; min-width: 45px;">${scrollSpeed.toFixed(2)}x</span>
`;

// Create refresh time control
const timeControl = document.createElement('div');
timeControl.style.cssText = `
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;
timeControl.innerHTML = `
  <label style="color: black; font-weight: 500;">Refresh:</label>
  <input type="number" min="1" max="60" value="4" style="
    width: 50px;
    padding: 4px 8px;
    border: 1px solid #E5E5E5;
    border-radius: 4px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
  ">
  <span style="color: black;">min</span>
`;

// Create auto refresh toggle
const refreshToggle = document.createElement('div');
refreshToggle.style.cssText = `
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;
refreshToggle.innerHTML = `
  <label style="color: black; font-weight: 500;">Auto Refresh:</label>
  <label class="switch" style="
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
  ">
    <input type="checkbox" style="
      opacity: 0;
      width: 0;
      height: 0;
    ">
    <span style="
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #E5E5E5;
      transition: .4s;
      border-radius: 20px;
    ">
      <span style="
        position: absolute;
        content: '';
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
        transform: translateX(0);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      "></span>
    </span>
  </label>
`;

// Add elements to panel
panel.appendChild(button);
panel.appendChild(speedControl);
panel.appendChild(timeControl);
panel.appendChild(refreshToggle);

// Add panel to page
document.body.appendChild(panel);

// Speed control event listener
const speedInput = speedControl.querySelector('input');
const speedValue = speedControl.querySelector('span');
speedInput.addEventListener('input', (e) => {
  scrollSpeed = parseFloat(e.target.value);
  speedValue.textContent = scrollSpeed.toFixed(2) + 'x';
  if (isScrolling) {
    startScrolling();
  }
});

// Time control event listener
const timeInput = timeControl.querySelector('input');
timeInput.addEventListener('input', (e) => {
  refreshTime = Math.max(1, Math.min(60, parseInt(e.target.value) || 4));
  timeInput.value = refreshTime;
  if (isAutoRefreshEnabled) {
    startAutoRefresh(); // Restart with new time
  }
});

// Auto refresh toggle event listener
const refreshCheckbox = refreshToggle.querySelector('input');
const toggleSlider = refreshToggle.querySelector('span > span');

refreshCheckbox.addEventListener('change', (e) => {
  isAutoRefreshEnabled = e.target.checked;
  toggleSlider.style.transform = isAutoRefreshEnabled ? 'translateX(20px)' : 'translateX(0)';
  refreshToggle.querySelector('span').style.backgroundColor = isAutoRefreshEnabled ? 'black' : '#E5E5E5';
  
  if (isAutoRefreshEnabled && isScrolling) {
    startAutoRefresh();
  } else {
    clearInterval(autoRefreshInterval);
  }
});

// Toggle auto-scroll
button.addEventListener('click', () => {
  isScrolling = !isScrolling;
  button.textContent = isScrolling ? 'Stop Auto-Scroll' : 'Start Auto-Scroll';
  button.style.background = isScrolling ? '#333' : 'black';
  
  if (isScrolling) {
    startScrolling();
    if (isAutoRefreshEnabled) {
      startAutoRefresh();
    }
  } else {
    stopScrolling();
    // Don't clear autoRefreshInterval here, let it continue if enabled
  }
});

function startScrolling() {
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
  }
  clearInterval(scrollInterval);

  let lastTimestamp = 0;
  let accumulatedDelta = 0;
  let currentVelocity = 0;
  const maxVelocity = 10;
  const acceleration = 0.2;
  const deceleration = 0.1;

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function smoothScroll(timestamp) {
    if (!isScrolling) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Calculate base scroll amount with improved precision
    const baseScrollAmount = 0.3; // Reduced base speed for finer control
    const targetScrollAmount = baseScrollAmount * scrollSpeed;
    
    // Smooth acceleration and deceleration
    if (currentVelocity < targetScrollAmount) {
      currentVelocity = Math.min(currentVelocity + acceleration, targetScrollAmount);
    } else if (currentVelocity > targetScrollAmount) {
      currentVelocity = Math.max(currentVelocity - deceleration, targetScrollAmount);
    }

    // Accumulate sub-pixel scrolling
    accumulatedDelta += currentVelocity * deltaTime;

    // Only scroll when we have at least 0.5 pixels to move (for smoother sub-pixel scrolling)
    if (accumulatedDelta >= 0.5) {
      const pixelsToScroll = Math.floor(accumulatedDelta);
      accumulatedDelta -= pixelsToScroll;

      const currentPos = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      if (currentPos < maxScroll) {
        // Calculate target position with easing
        const remainingDistance = maxScroll - currentPos;
        const easeFactor = Math.min(1, remainingDistance / 1000); // Gradually slow down near the bottom
        const easedPixels = pixelsToScroll * easeFactor;

        // Use transform for hardware-accelerated scrolling
        window.scrollTo({
          top: currentPos + easedPixels,
          behavior: 'auto'
        });
      }
    }

    scrollAnimationFrame = requestAnimationFrame(smoothScroll);
  }

  scrollAnimationFrame = requestAnimationFrame(smoothScroll);
}

function stopScrolling() {
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
  }
  clearInterval(scrollInterval);
}

function startAutoRefresh() {
  clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    // Stop scrolling before moving to top
    stopScrolling();
    
    // Smoothly scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // Wait for scroll to complete, then refresh feed
    setTimeout(() => {
      // Find the main feed container
      const feedContainer = document.querySelector('[data-testid="primaryColumn"]');
      if (feedContainer) {
        // Find and click the "For you" tab to refresh feed
        const forYouTab = document.querySelector('[role="tab"][aria-selected="true"]');
        if (forYouTab) {
          forYouTab.click();
          // Click again after a small delay to ensure refresh
          setTimeout(() => {
            forYouTab.click();
          }, 100);
        }

        // Alternative: Find and click refresh button if available
        const refreshButton = document.querySelector('[data-testid="refresh"]');
        if (refreshButton) {
          refreshButton.click();
        }
      }
      
      // Resume scrolling after a short delay
      setTimeout(() => {
        if (isScrolling) {
          startScrolling();
        }
      }, 1500);
    }, 1000);
  }, refreshTime * 60 * 1000);
}

// Clean up on page unload
window.addEventListener('unload', () => {
  stopScrolling();
  clearInterval(autoRefreshInterval);
}); 