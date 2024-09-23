const profileContainer = document.getElementById('profile-picture-container');

profileContainer.addEventListener('mousemove', (e) => {
    const rect = profileContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2; // Center X of the container
    const centerY = rect.top + rect.height / 2; // Center Y of the container

    const x = e.clientX - centerX; // Horizontal distance from center
    const y = e.clientY - centerY; // Vertical distance from center

    // Calculate rotation based on distance from center
    const rotateX = (y / (rect.height / 2)) * 15; // Max rotation of 15 degrees
    const rotateY = (x / (rect.width / 2)) * -15; // Max rotation of -15 degrees

    // Apply rotation to the container
    profileContainer.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.1)`; // Slight scale for effect
});

profileContainer.addEventListener('mouseleave', () => {
    profileContainer.style.transform = 'rotateX(0) rotateY(0) scale(1)'; // Reset on mouse leave
});
