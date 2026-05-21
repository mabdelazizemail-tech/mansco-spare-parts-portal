import { dealers, formatEGP } from "@/lib/portal-data";
import { StatusBadge } from "@/components/portal/StatusBadge";

const DealersAdmin = () => (
  <div className="space-y-6">
    <div>
      <p className="eyebrow mb-2">Network</p>
      <h1 className="display-lg">Dealers & Sub-Dealers</h1>
    </div>

    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Dealer</th>
              <th>Tier</th>
              <th>Credit Limit</th>
              <th>Outstanding</th>
              <th>Overdue</th>
              <th>Covering</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dealers.map((d) => (
              <tr key={d.id}>
                <td>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{d.code} · {d.city} · {d.contact}</p>
                </td>
                <td className="text-xs">{d.tier}{d.parentId && <p className="text-muted-foreground">parent {d.parentId}</p>}</td>
                <td className="text-sm">{formatEGP(d.creditLimit)}</td>
                <td className="text-sm">{formatEGP(d.outstanding)}</td>
                <td className={`text-sm ${d.overdue > 0 ? "text-destructive font-medium" : ""}`}>{formatEGP(d.overdue)}</td>
                <td className="text-sm">{d.covering}%</td>
                <td>
                  <StatusBadge tone={d.status === "Active" ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}>
                    {d.status}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default DealersAdmin;
