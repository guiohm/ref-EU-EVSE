export const events = {
    execUserSql: 'execUserSql',
    dbLoaded: 'dbLoaded',
}

export const queries = [
    {
        title: 'Problèmes par organisation',
        type: '1',
        sql:
`SELECT l.datagouv_organization_or_owner, problemes, level, count(1) as occurrences, msg FROM logs l
  LEFT JOIN (
    SELECT datagouv_organization_or_owner, count(1) as problemes FROM logs GROUP BY datagouv_organization_or_owner
    ) AS b ON b.datagouv_organization_or_owner = l.datagouv_organization_or_owner
GROUP BY l.datagouv_organization_or_owner, level, msg ORDER BY problemes DESC, level;`,
    },{
        title: 'Liste des problèmes',
        type: '1',
        sql: 'SELECT level, msg, COUNT(1) as occurrences FROM logs GROUP BY level, msg',
    },
]
