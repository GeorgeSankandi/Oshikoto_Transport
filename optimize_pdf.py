import pathlib
import re

# Read the file
filepath = pathlib.Path(r'c:\Users\George\Documents\Oshikoto_Logistics&Transport\views\services\show.hbs')
content = filepath.read_text(encoding='utf-8')

# Replace all remaining table cell patterns in checklist section
# Match <td class="p-1 border...> patterns and replace with optimized inline styles
pattern = r'<td class="p-1 border([^"]*?)">'
replacement = r'<td style="padding: 3px 2px; border: 1px solid #dee2e6;" class="\1">'
new_content = re.sub(pattern, replacement, content)

# Replace badge spans with smaller font only if not already styled
pattern2 = r'<span class="badge bg-secondary">{{checklistStatus'
replacement2 = r'<span class="badge bg-secondary" style="font-size: 10px;">{{checklistStatus'
new_content = re.sub(pattern2, replacement2, new_content)

# Write back
filepath.write_text(new_content, encoding='utf-8')
print('Optimized all table cells in checklist')
