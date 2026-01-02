// Helper function to generate realistic metrics
const generateMetrics = (acquisitionDate) => {
    const now = new Date();
    const daysSinceAcq = (now - acquisitionDate) / (1000 * 60 * 60 * 24);

    // Operating time (approx 8h/day, 5 days/week => ~2000h/year)
    const years = daysSinceAcq / 365;
    const operatingTime = Math.floor(years * 2000);

    // MTBF: Random between 500 and 3000 hours
    const mtbf = 500 + Math.floor(Math.random() * 2500);

    // MTTR: Random between 1 and 8 hours
    const mttr = 1 + Math.floor(Math.random() * 7);

    // Downtime: OperatingTime / MTBF * MTTR
    const failures = operatingTime / mtbf;
    const downtime = Math.floor(failures * mttr);

    // Availability calculation
    // Total Time = Operating Time + Downtime (simplification)
    const totalTime = operatingTime + downtime;
    const availability = totalTime > 0 ? (operatingTime / totalTime) * 100 : 100;

    return {
        mtbf,
        mttr,
        operatingTime,
        downtime,
        availability: parseFloat(availability.toFixed(2))
    };
};
