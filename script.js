// API Endpoints
const API_URL = 'https://disease.sh/v3/covid-19';
const ENDPOINTS = {
    global: `${API_URL}/all`,
    historical: `${API_URL}/historical/all?lastdays=all`,
    countries: `${API_URL}/countries?sort=cases`
};

// Global State
let historicalData = null;
let trendChartInstance = null;
let topCountriesChartInstance = null;
let currentTrendType = 'cases';
let topCountriesData = null;

// Format numbers
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
};

// Format large numbers (1.2M, 3.4K)
const formatCompact = (num) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    try {
        await Promise.all([
            fetchGlobalData(),
            fetchHistoricalData(),
            fetchCountriesData()
        ]);
        
        // Hide loader
        document.getElementById('loader').classList.add('hidden');
        
        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Failed to load COVID-19 data. Please try again later.');
    }
});

// Fetch Global Summary
async function fetchGlobalData() {
    const response = await fetch(ENDPOINTS.global);
    const data = await response.json();
    
    // Update DOM
    document.getElementById('totalCases').textContent = formatNumber(data.cases);
    document.getElementById('todayCases').textContent = `+${formatNumber(data.todayCases)} today`;
    
    document.getElementById('totalDeaths').textContent = formatNumber(data.deaths);
    document.getElementById('todayDeaths').textContent = `+${formatNumber(data.todayDeaths)} today`;
    
    document.getElementById('totalRecovered').textContent = formatNumber(data.recovered);
    document.getElementById('todayRecovered').textContent = `+${formatNumber(data.todayRecovered)} today`;
    
    document.getElementById('activeCases').textContent = formatNumber(data.active);
    
    // Update timestamp
    const date = new Date(data.updated);
    document.getElementById('lastUpdated').textContent = `Last updated: ${date.toLocaleString()}`;
}

async function fetchHistoricalData() {
    const response = await fetch(ENDPOINTS.historical);
    historicalData = await response.json();
    
    // Extract available years for the dropdown
    const availableYears = new Set();
    const allDates = Object.keys(historicalData.cases);
    allDates.forEach(dateStr => {
        // split method to get year
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            let yearPart = parts[2];
            let fullYear = yearPart.length === 2 ? '20' + yearPart : yearPart;
            availableYears.add(fullYear);
        }
    });
    
    const yearFilter = document.getElementById('yearFilter');
    yearFilter.innerHTML = '<option value="all">All Years</option>';
    Array.from(availableYears).sort().forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        yearFilter.appendChild(opt);
    });
    
    renderTrendChart('cases');
}

// Fetch Countries Data
async function fetchCountriesData() {
    const response = await fetch(ENDPOINTS.countries);
    const data = await response.json();
    
    // Top 10 for chart
    topCountriesData = data.slice(0, 10);
    renderCountriesChart(topCountriesData);
    
    // Top 50 for table
    const top50 = data.slice(0, 50);
    renderTable(top50);
}

function renderTrendChart(type) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }
    
    const yearFilter = document.getElementById('yearFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    
    let dates = [];
    let values = [];
    
    Object.entries(historicalData[type]).forEach(([dateStr, value]) => {
        // split method to get month and year
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            let m = parts[0];
            let y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            
            let matchYear = (yearFilter === 'all') || (y === yearFilter);
            let matchMonth = (monthFilter === 'all') || (m === monthFilter);
            
            if (matchYear && matchMonth) {
                dates.push(dateStr);
                values.push(value);
            }
        }
    });
    
    let color, bgColor;
    if (type === 'cases') {
        color = '#3b82f6';
        bgColor = 'rgba(59, 130, 246, 0.1)';
    } else if (type === 'deaths') {
        color = '#ef4444';
        bgColor = 'rgba(239, 68, 68, 0.1)';
    } else {
        color = '#10b981';
        bgColor = 'rgba(16, 185, 129, 0.1)';
    }
    
    const isLight = document.body.classList.contains('light-theme');
    Chart.defaults.color = isLight ? '#475569' : '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: `Total ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                data: values,
                borderColor: color,
                backgroundColor: bgColor,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                    titleColor: isLight ? '#0f172a' : '#f8fafc',
                    bodyColor: isLight ? '#0f172a' : '#f8fafc',
                    borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return formatNumber(context.parsed.y);
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    grid: { display: false, color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' },
                    ticks: { maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' },
                    ticks: {
                        callback: function(value) {
                            return formatCompact(value);
                        }
                    }
                }
            }
        }
    });
}

// Render Top Countries Chart
function renderCountriesChart(data) {
    const ctx = document.getElementById('countriesChart').getContext('2d');
    
    const labels = data.map(val => val.country);
    const cases = data.map(val => val.cases);
    
    if (topCountriesChartInstance) {
        topCountriesChartInstance.destroy();
    }
    
    const isLight = document.body.classList.contains('light-theme');
    
    topCountriesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Cases',
                data: cases,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                hoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                    titleColor: isLight ? '#0f172a' : '#f8fafc',
                    bodyColor: isLight ? '#0f172a' : '#f8fafc',
                    borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return formatNumber(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    grid: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' },
                    ticks: {
                        callback: function(value) {
                            return formatCompact(value);
                        }
                    }
                }
            }
        }
    });
}

// Render Table
function renderTable(data) {
    const tbody = document.querySelector('#countriesTable tbody');
    tbody.innerHTML = '';
    
    data.forEach(country => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <div class="country-cell">
                    <img src="${country.countryInfo.flag}" alt="${country.country} flag" class="country-flag">
                    ${country.country}
                </div>
            </td>
            <td style="color: var(--color-cases)">${formatNumber(country.cases)}</td>
            <td style="color: var(--color-deaths)">${formatNumber(country.deaths)}</td>
            <td style="color: var(--color-recovered)">${formatNumber(country.recovered)}</td>
            <td>${formatNumber(country.active)}</td>
            <td>${formatNumber(country.casesPerOneMillion)}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function setupEventListeners() {
    const buttons = document.querySelectorAll('.chart-controls .btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active class from all
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked
            e.target.classList.add('active');
            
            // Re-render chart
            currentTrendType = e.target.dataset.type;
            renderTrendChart(currentTrendType);
        });
    });
    
    // Filter controls
    document.getElementById('yearFilter').addEventListener('change', () => {
        renderTrendChart(currentTrendType);
    });
    document.getElementById('monthFilter').addEventListener('change', () => {
        renderTrendChart(currentTrendType);
    });
    
    // Theme toggle
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            updateThemeIcons();
            
            // Re-render charts with new theme colors
            if (historicalData) renderTrendChart(currentTrendType);
            if (topCountriesData) renderCountriesChart(topCountriesData);
        });
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
    updateThemeIcons();
}

function updateThemeIcons() {
    const isLight = document.body.classList.contains('light-theme');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    if (sunIcon && moonIcon) {
        if (isLight) {
            sunIcon.classList.remove('hidden-icon');
            moonIcon.classList.add('hidden-icon');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.classList.add('hidden-icon');
            moonIcon.classList.remove('hidden-icon');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
}
