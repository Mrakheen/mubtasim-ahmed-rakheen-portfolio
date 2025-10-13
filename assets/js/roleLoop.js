const roles = [
    "Full Stack Development",
    "Mobile Development",
    "UI/UX Design",
    "Cloud Services"
  ];
  
  let currentRoleIndex = 0;
  let currentCharIndex = 0;
  let isDeleting = false;
  const typingSpeed = 150; // Speed for typing each character
  const deletingSpeed = 100; // Speed for deleting each character
  const pauseTime = 2000; // Pause between switching roles
  
  function typeRole() {
    const roleElement = document.getElementById('role');
    const currentRole = roles[currentRoleIndex];
    
    if (!isDeleting) {
      // Typing effect
      roleElement.textContent = currentRole.slice(0, ++currentCharIndex);
      
      if (currentCharIndex === currentRole.length) {
        isDeleting = true;
        setTimeout(typeRole, pauseTime); // Pause after typing the entire role
        return;
      }
    } else {
      // Deleting effect
      roleElement.textContent = currentRole.slice(0, --currentCharIndex);
      
      if (currentCharIndex === 0) {
        isDeleting = false;
        currentRoleIndex = (currentRoleIndex + 1) % roles.length; // Move to the next role
      }
    }
    
    setTimeout(typeRole, isDeleting ? deletingSpeed : typingSpeed);
  }
  
  // Start typing on page load
  document.addEventListener('DOMContentLoaded', typeRole);

  

