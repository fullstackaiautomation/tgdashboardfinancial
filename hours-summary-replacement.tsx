// Replace the "Today's Schedule" section (lines 3023-3278) with this:

            {/* Deep Work Hours Summary Table */}
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Deep Work Hours Summary</h3>

                {/* Filter Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', display: 'block' }}>Filter by Area</label>
                    <select
                      value={selectedDWArea}
                      onChange={(e) => setSelectedDWArea(e.target.value as Area | 'All Areas')}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="All Areas">All Areas</option>
                      {areas.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', display: 'block' }}>Filter by Money Maker</label>
                    <select
                      value={selectedEffortLevel}
                      onChange={(e) => setSelectedEffortLevel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="All Levels">All Levels</option>
                      <option value="$ Some Money">$ Some Money</option>
                      <option value="$$ Big Money">$$ Big Money</option>
                      <option value="$$$ Huge Money">$$$ Huge Money</option>
                    </select>
                  </div>
                </div>

                {/* Summary Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #444' }}>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>Category</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>Today</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>This Week</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>This Month</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>All Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calculate hours for each area or money maker level based on filter
                      const calculateHours = (category: string, period: 'today' | 'week' | 'month' | 'all') => {
                        const now = new Date()
                        let startDate: Date

                        if (period === 'today') {
                          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                        } else if (period === 'week') {
                          startDate = new Date(now)
                          startDate.setDate(now.getDate() - now.getDay())
                          startDate.setHours(0, 0, 0, 0)
                        } else if (period === 'month') {
                          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                        } else {
                          startDate = new Date(0)
                        }

                        let filteredSessions = deepWorkSessions.filter(s => {
                          const sessionDate = new Date(s.start_time)
                          if (sessionDate < startDate) return false

                          // Filter by selected area if not "All Areas"
                          if (selectedDWArea !== 'All Areas' && s.area !== selectedDWArea) return false

                          // Filter by category (area or money maker)
                          if (selectedEffortLevel === 'All Levels' || selectedEffortLevel === 'All Areas') {
                            return category === 'All' || s.area === category
                          } else {
                            // Filter by money maker level - need to match tasks
                            const task = tasks.find(t => t.id === s.task_id)
                            return task?.effort_level === category
                          }
                        })

                        const totalMinutes = filteredSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
                        return (totalMinutes / 60).toFixed(1)
                      }

                      // Determine what categories to show
                      let categories: { name: string; color: string }[] = []

                      if (selectedEffortLevel !== 'All Levels') {
                        // Show money maker levels
                        categories = [
                          { name: '$ Some Money', color: '#10b981' },
                          { name: '$$ Big Money', color: '#f59e0b' },
                          { name: '$$$ Huge Money', color: '#ef4444' }
                        ]
                      } else {
                        // Show areas
                        categories = areas.map(area => ({
                          name: area,
                          color: getAreaColor(area as Area)
                        }))
                      }

                      // Add filtered categories to table
                      const filteredCategories = selectedDWArea !== 'All Areas'
                        ? categories.filter(c => c.name === selectedDWArea)
                        : categories

                      return (
                        <>
                          {filteredCategories.map(category => (
                            <tr key={category.name} style={{ borderBottom: '1px solid #333' }}>
                              <td style={{ padding: '12px' }}>
                                <span style={{ color: category.color, fontWeight: '600' }}>{category.name}</span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px', color: '#e5e7eb' }}>
                                {calculateHours(category.name, 'today')}h
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px', color: '#e5e7eb' }}>
                                {calculateHours(category.name, 'week')}h
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px', color: '#e5e7eb' }}>
                                {calculateHours(category.name, 'month')}h
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px', color: '#e5e7eb', fontWeight: 'bold' }}>
                                {calculateHours(category.name, 'all')}h
                              </td>
                            </tr>
                          ))}
                          {/* Total Row */}
                          <tr style={{ borderTop: '2px solid #444', fontWeight: 'bold' }}>
                            <td style={{ padding: '12px', color: '#fff' }}>Total</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>
                              {calculateHours('All', 'today')}h
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>
                              {calculateHours('All', 'week')}h
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>
                              {calculateHours('All', 'month')}h
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#fbbf24', fontSize: '16px' }}>
                              {calculateHours('All', 'all')}h
                            </td>
                          </tr>
                        </>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            </div>