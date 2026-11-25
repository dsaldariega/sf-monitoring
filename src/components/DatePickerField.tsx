import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DatePickerField({ label, value, onChange }: Props) {
  const selectedDate = toDate(value);
  const [visible, setVisible] = useState(false);
  const [shownMonth, setShownMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12)
  );

  const cells = useMemo(() => {
    const firstDay = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1, 12).getDay();
    const daysInMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 0, 12).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  }, [shownMonth]);

  const changeMonth = (amount: number) => {
    setShownMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1, 12));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dateButton} onPress={() => {
        setShownMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12));
        setVisible(true);
      }}>
        <Text style={styles.dateText}>{selectedDate.toLocaleDateString('en-PH', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}</Text>
        <Text style={styles.calendarIcon}>▦</Text>
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Pressable onPress={() => changeMonth(-1)} style={styles.nav}><Text style={styles.navText}>‹</Text></Pressable>
              <Text style={styles.monthTitle}>{shownMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</Text>
              <Pressable onPress={() => changeMonth(1)} style={styles.nav}><Text style={styles.navText}>›</Text></Pressable>
            </View>
            <View style={styles.grid}>
              {WEEKDAYS.map((day, index) => (
                <View key={index} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>
              ))}
              {cells.map((day, index) => {
                if (day === null) return <View key={`empty-${index}`} style={styles.cell} />;
                const date = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), day, 12);
                const isSelected = formatDate(date) === value;
                return (
                  <Pressable key={day} style={[styles.cell, styles.dayCell, isSelected && styles.selectedDay]}
                    onPress={() => { onChange(formatDate(date)); setVisible(false); }}>
                    <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.cancel} onPress={() => setVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  dateButton: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { color: theme.colors.text, fontSize: 14 },
  calendarIcon: { color: theme.colors.primary, fontSize: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'center', padding: 22 },
  modal: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  navText: { color: theme.colors.primary, fontSize: 26, lineHeight: 28 },
  monthTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: theme.colors.muted, fontSize: 12, fontWeight: '800' },
  dayCell: { borderRadius: 21 },
  selectedDay: { backgroundColor: theme.colors.primary },
  dayText: { color: theme.colors.text, fontSize: 13 },
  selectedDayText: { color: '#FFFFFF', fontWeight: '800' },
  cancel: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 9 },
  cancelText: { color: theme.colors.primary, fontWeight: '800' },
});
