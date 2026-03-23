import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

const CLOTHING_CATEGORIES = [
  'Coats', 'Jackets', 'Cardigans', 'Sweaters', 'Blouses',
  'T shirts', 'Dresses', 'Pants', 'Skirts', 'Shorts', 'Shoes', 'Bags',
];

const SEASONS = ['Spring/Summer', 'Fall/Winter', 'All Season'];
const COLORS_LIST = ['White', 'Black', 'Navy', 'Beige', 'Brown', 'Pink', 'Red', 'Green', 'Blue', 'Gray'];

export default function AddItemScreen() {
  const navigation = useNavigation<any>();
  const [caption, setCaption] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Category Required', 'Please select at least one category for this item.');
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigation.goBack();
    }, 1500);
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleAddPhoto = () => {
    // In production: use expo-image-picker
    setImageUri('https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&h=400&fit=crop');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Item</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image + Caption Row */}
        <View style={styles.imageRow}>
          <TouchableOpacity onPress={handleAddPhoto} style={styles.imagePicker}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.selectedImage} resizeMode="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={28} color={Colors.mediumGray} />
                <Text style={styles.imagePlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.captionContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="Write Caption"
              placeholderTextColor={Colors.primary}
              value={caption}
              onChangeText={setCaption}
              multiline
            />
            <View style={styles.importRow}>
              <TouchableOpacity style={styles.importBtn}>
                <Ionicons name="link" size={14} color={Colors.textSecondary} />
                <Text style={styles.importBtnText}>Import from URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Brand & Price */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Brand</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Zara"
              placeholderTextColor={Colors.mediumGray}
              value={brand}
              onChangeText={setBrand}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Price ($)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="0.00"
              placeholderTextColor={Colors.mediumGray}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Season */}
        <Text style={styles.sectionLabel}>Season</Text>
        <View style={styles.seasonRow}>
          {SEASONS.map((season) => (
            <TouchableOpacity
              key={season}
              onPress={() => setSelectedSeason(season)}
              style={[
                styles.seasonPill,
                selectedSeason === season && styles.seasonPillActive,
              ]}
            >
              <Text style={[
                styles.seasonPillText,
                selectedSeason === season && styles.seasonPillTextActive,
              ]}>
                {season}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Choose Category */}
        <Text style={styles.sectionLabel}>Choose category</Text>
        <View style={styles.categoriesList}>
          {CLOTHING_CATEGORIES.map((cat) => (
            <View key={cat} style={styles.categoryRow}>
              <Switch
                value={selectedCategories.includes(cat)}
                onValueChange={() => toggleCategory(cat)}
                trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.lightGray}
              />
              <Text style={styles.categoryText}>{cat}</Text>
            </View>
          ))}
        </View>

        {/* Color */}
        <Text style={styles.sectionLabel}>Color</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsScroll}>
          {COLORS_LIST.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setSelectedColor(color)}
              style={[
                styles.colorPill,
                selectedColor === color && styles.colorPillActive,
              ]}
            >
              <Text style={[
                styles.colorPillText,
                selectedColor === color && styles.colorPillTextActive,
              ]}>
                {color}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {saved && (
          <View style={styles.savedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
            <Text style={styles.savedText}>Item saved to your closet!</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  imageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
    gap: Spacing.md,
  },
  imagePicker: {
    width: 100,
    height: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mediumGray,
    marginTop: 4,
    fontWeight: '500',
  },
  captionContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  captionInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    textAlignVertical: 'top',
  },
  importRow: {
    marginTop: Spacing.xs,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  importBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  seasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  seasonPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  seasonPillActive: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  seasonPillText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  seasonPillTextActive: {
    color: Colors.white,
  },
  categoriesList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  categoryText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
    fontWeight: '500',
  },
  colorsScroll: {
    marginBottom: Spacing.base,
  },
  colorPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    marginRight: Spacing.sm,
  },
  colorPillActive: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  colorPillText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  colorPillTextActive: {
    color: Colors.white,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  savedText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.fontSize.sm,
  },
});
