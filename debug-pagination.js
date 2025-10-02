// Debug script to check technician counts
console.log('🔍 Debugging technician counts...');

// Run This in your browser console (F12 -> Console) on the home page
const checkTechnicianCounts = async () => {
  try {
    // Check what's in localStorage
    console.log('📦 LocalStorage technician data:', localStorage.getItem('technicians'));
    
    // Check the global profiles state if available
    if (window.profiles) {
      console.log('🌐 Global profiles count:', window.profiles.length);
      console.log('🌐 Global profiles:', window.profiles);
    }
    
    // Check the DOM for any pagination elements
    const paginationElements = document.querySelectorAll('[data-pagination], .pagination, [class*="page"]');
    console.log('📄 Found pagination elements:', paginationElements);
    
    paginationElements.forEach((el, i) => {
      console.log(`📄 Pagination element ${i}:`, el.textContent, el);
    });
    
    // Check for any elements containing numbers that might be pagination
    const textNodes = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return /\d+\s*(of|pages?|total)/i.test(node.textContent) ? 
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const foundTexts = [];
    let node;
    while (node = textNodes.nextNode()) {
      foundTexts.push({
        text: node.textContent.trim(),
        parent: node.parentElement
      });
    }
    
    console.log('🔢 Found text with numbers:', foundTexts);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

checkTechnicianCounts();