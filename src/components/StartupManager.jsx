import React, { useState, useEffect } from 'react';
import { FaSearch, FaSync, FaRocket, FaPlus, FaCheckSquare, FaSquare } from 'react-icons/fa';
import StartupProgramCard from './StartupProgramCard';
import BootTimeChart from './BootTimeChart';
import './StartupManager.css';

const StartupManager = () => {
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [impactFilter, setImpactFilter] = useState('All');
  const [selectedPrograms, setSelectedPrograms] = useState(new Set());
  const [bootStats, setBootStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [trend, setTrend] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [categories, setCategories] = useState(['All']);

  // Load data on mount
  useEffect(() => {
    loadStartupPrograms();
    loadBootStats();
    loadChartData();
    loadTrend();
    loadRecommendations();
  }, []);

  // Filter programs when search or filters change
  useEffect(() => {
    filterPrograms();
  }, [programs, searchQuery, categoryFilter, impactFilter]);

  const loadStartupPrograms = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getStartupPrograms();
      if (result.success) {
        setPrograms(result.data);

        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(result.data.map(p => p.category))];
        setCategories(uniqueCategories);
      } else {
        console.error('Error loading startup programs:', result.error);
      }
    } catch (error) {
      console.error('Error loading startup programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBootStats = async () => {
    try {
      const result = await window.electronAPI.getBootTimeStats(30);
      if (result.success) {
        setBootStats(result.data);
      }
    } catch (error) {
      console.error('Error loading boot stats:', error);
    }
  };

  const loadChartData = async () => {
    try {
      const result = await window.electronAPI.getBootTimeChartData(30);
      if (result.success) {
        setChartData(result.data);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const loadTrend = async () => {
    try {
      const result = await window.electronAPI.getBootTimeTrend(7);
      if (result.success) {
        setTrend(result.data);
      }
    } catch (error) {
      console.error('Error loading trend:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const result = await window.electronAPI.getStartupRecommendations();
      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const filterPrograms = () => {
    let filtered = programs;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.publisher.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Impact filter
    if (impactFilter !== 'All') {
      filtered = filtered.filter(p => p.impact === impactFilter.toLowerCase());
    }

    setFilteredPrograms(filtered);
  };

  const handleToggleProgram = async (itemId, enabled) => {
    try {
      const result = await window.electronAPI.toggleStartupProgram(itemId, enabled);
      if (result.success) {
        // Update local state
        setPrograms(prevPrograms =>
          prevPrograms.map(p => (p.id === itemId ? { ...p, enabled } : p))
        );

        // Reload stats and recommendations
        loadBootStats();
        loadRecommendations();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling program:', error);
      alert('Failed to toggle program. Please try again.');
    }
  };

  const handleRemoveProgram = async (itemId) => {
    try {
      const result = await window.electronAPI.removeStartupProgram(itemId);
      if (result.success) {
        // Remove from local state
        setPrograms(prevPrograms => prevPrograms.filter(p => p.id !== itemId));

        // Reload stats and recommendations
        loadBootStats();
        loadRecommendations();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error removing program:', error);
      alert('Failed to remove program. Please try again.');
    }
  };

  const handleSelectProgram = (itemId, selected) => {
    setSelectedPrograms(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const nonEssentialPrograms = filteredPrograms.filter(p => !p.essential);
    if (selectedPrograms.size === nonEssentialPrograms.length) {
      // Deselect all
      setSelectedPrograms(new Set());
    } else {
      // Select all non-essential
      setSelectedPrograms(new Set(nonEssentialPrograms.map(p => p.id)));
    }
  };

  const handleDisableSelected = async () => {
    if (selectedPrograms.size === 0) {
      alert('No programs selected');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to disable ${selectedPrograms.size} selected program(s)?`
    );

    if (!confirmed) return;

    let successCount = 0;
    let errorCount = 0;

    for (const itemId of selectedPrograms) {
      try {
        const result = await window.electronAPI.toggleStartupProgram(itemId, false);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    // Clear selection
    setSelectedPrograms(new Set());

    // Reload data
    await loadStartupPrograms();
    await loadBootStats();
    await loadRecommendations();

    alert(`Disabled ${successCount} program(s). ${errorCount > 0 ? `Failed: ${errorCount}` : ''}`);
  };

  const handleOptimizeAll = async () => {
    const confirmed = window.confirm(
      'This will automatically disable all non-essential high-impact startup programs based on recommendations.\n\nDo you want to continue?'
    );

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.optimizeStartup();
      if (result.success) {
        alert(
          `Optimization complete!\n\nDisabled ${result.disabledCount} program(s):\n${result.disabledPrograms.join('\n')}`
        );

        // Reload data
        await loadStartupPrograms();
        await loadBootStats();
        await loadRecommendations();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error optimizing startup:', error);
      alert('Failed to optimize startup. Please try again.');
    }
  };

  const handleRefresh = async () => {
    await loadStartupPrograms();
    await loadBootStats();
    await loadChartData();
    await loadTrend();
    await loadRecommendations();
  };

  // Calculate potential improvement
  const calculatePotentialImprovement = () => {
    if (!bootStats || !bootStats.current) return null;

    const enabledHighImpact = programs.filter(p => p.enabled && p.impact === 'high' && !p.essential);
    const totalSavings = enabledHighImpact.reduce((sum, p) => sum + (p.bootTimeImpactSeconds || 8), 0);

    if (totalSavings === 0) return null;

    const currentTime = bootStats.current;
    const potentialTime = Math.max(15, currentTime - totalSavings * 0.8);
    const savings = currentTime - potentialTime;
    const improvement = Math.round((savings / currentTime) * 100);

    return {
      currentTime,
      potentialTime: Math.round(potentialTime),
      savings: Math.round(savings),
      improvement
    };
  };

  const improvement = calculatePotentialImprovement();

  if (loading) {
    return (
      <div className="startup-manager-loading">
        <div className="loader"></div>
        <p>Loading startup programs...</p>
      </div>
    );
  }

  return (
    <div className="startup-manager">
      <div className="startup-header">
        <div className="header-title">
          <h2>
            <FaRocket /> Quick Actions
          </h2>
        </div>

        <button className="btn-refresh" onClick={handleRefresh} title="Refresh">
          <FaSync />
        </button>
      </div>

      {/* Boot Performance Stats */}
      <div className="boot-performance-section">
        <div className="performance-cards">
          <div className="performance-card">
            <div className="card-label">Current Boot Time</div>
            <div className="card-value">
              {bootStats?.current ? `${bootStats.current}s` : 'N/A'}
            </div>
            <div className="card-sublabel">
              {bootStats?.average ? `Avg: ${bootStats.average}s` : ''}
            </div>
          </div>

          <div className="performance-card">
            <div className="card-label">Potential Boot Time</div>
            <div className="card-value">
              {improvement ? `${improvement.potentialTime}s` : 'N/A'}
            </div>
            <div className="card-sublabel">
              {improvement ? '(if disabled selected)' : 'Optimize to improve'}
            </div>
          </div>

          <div className="performance-card card-highlight">
            <div className="card-label">Potential Improvement</div>
            <div className="card-value">
              {improvement ? `${improvement.savings}s` : '0s'}
            </div>
            <div className="card-sublabel">
              {improvement ? `${improvement.improvement}% faster` : 'No optimization available'}
            </div>
          </div>
        </div>
      </div>

      {/* Boot Time Chart */}
      <BootTimeChart data={chartData} trend={trend} />

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>Recommendations ({recommendations.length})</h3>
          <div className="recommendations-list">
            {recommendations.slice(0, 5).map((rec, index) => (
              <div key={index} className="recommendation-item">
                <span className="rec-icon"></span>
                <span className="rec-text">
                  {rec.action === 'disable' ? 'Disable' : 'Delay'} <strong>{rec.program}</strong>{' '}
                  (saves ~{rec.savings}s)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="controls-section">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)}>
            <option value="All">All Impact</option>
            <option value="High">High Impact</option>
            <option value="Medium">Medium Impact</option>
            <option value="Low">Low Impact</option>
          </select>
        </div>

        <div className="action-buttons">
          <button className="btn-secondary" onClick={handleSelectAll}>
            {selectedPrograms.size > 0 ? <FaCheckSquare /> : <FaSquare />}
            {selectedPrograms.size > 0 ? 'Deselect All' : 'Select All'}
          </button>

          {selectedPrograms.size > 0 && (
            <button className="btn-warning" onClick={handleDisableSelected}>
              Disable Selected ({selectedPrograms.size})
            </button>
          )}

          <button className="btn-primary" onClick={handleOptimizeAll}>
            <FaRocket /> Optimize All
          </button>
        </div>
      </div>

      {/* Programs List */}
      <div className="programs-section">
        <div className="programs-header">
          <h3>
            Startup Programs ({filteredPrograms.length})
          </h3>
          <span className="enabled-count">
            {programs.filter(p => p.enabled).length} enabled
          </span>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="no-programs">
            <p>No programs found matching your filters.</p>
          </div>
        ) : (
          <div className="programs-list">
            {filteredPrograms.map(program => (
              <StartupProgramCard
                key={program.id}
                program={program}
                onToggle={handleToggleProgram}
                onRemove={handleRemoveProgram}
                selected={selectedPrograms.has(program.id)}
                onSelect={handleSelectProgram}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StartupManager;
